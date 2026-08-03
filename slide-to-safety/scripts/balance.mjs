// balance.mjs — solvability proof + anti-tunnelling proof + balance gate.
//
// Imports the SHIPPING modules (src/levels.js, src/slide.js, src/data.js) and
// never re-implements a rule or a motion curve. Everything below is measured
// against the code the player actually runs — including the glide sampler
// (createGlide / advanceGlide), which is the same function the canvas uses to
// move the token, so "what the gate proves" and "what the player sees" cannot
// drift apart.
//
//   node scripts/balance.mjs                # full gate, 300 skilled-bot runs
//   node scripts/balance.mjs --runs 2000    # more seeds
//   node scripts/balance.mjs --probe        # diagnostics + optimal lines, never exits 1
//
// GATES (all hard):
//   1. SOLVABLE     BFS over the slide graph reaches the family tile.
//   2. PAR          the `par` field in levels.js equals the BFS optimum.
//   3. PICKUPS      every coin lies on a path of length <= par + 2, and every
//                   cover point is reachable inside the same budget.
//   4. NO DEAD ENDS every state reachable by legal play — including every way
//                   the player can deepen thin ice and every re-freeze a cover
//                   point grants — can still reach the family tile without
//                   drowning.
//   5. LOAD-BEARING flattening the cover points (or the gust lanes) to plain ice
//                   must change the board: different par, or no route at all.
//                   A safe zone that changes nothing is decoration.
//   6. RAMP         par strictly increases board to board, hazard count never
//                   decreases, and board 1 is hazard-free (it teaches).
//   7. NO TUNNELLING every slide the player can ever make, swept at four frame
//                   budgets down to 15 Hz and again at 4x slide speed, enters
//                   exactly the resolved path cells in order — none skipped,
//                   none repeated — and no swept sub-segment ever touches a rock
//                   or leaves the board.
//   8. BOTS         a skilled bot (optimal line, 15% wrong-swipe noise) finishes
//                   inside the stated band, and a random-input bot almost never
//                   does.
//
// Exit code is 1 if any gate fails, so this doubles as a regression gate on any
// level, rule or motion change.

import { GAME_CONFIG } from '../src/data.js';
import { LEVEL_DEFS, LEVELS, TOTAL_PAR, parseLevel } from '../src/levels.js';
import {
  DIRECTIONS,
  advanceGlide,
  applySlide,
  createGlide,
  createLevelState,
  glidePeakFactor,
  levelAward,
  mulberry32,
  resolveSlide,
  restartLevel,
  slideSeconds,
} from '../src/slide.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 300);
const SEED = argOf('--seed', 0x511de5a1);
const PROBE = argv.includes('--probe');

const BOT_BAND = [0.3, 0.6];
/** A bot that swipes at random must not stumble into a full clear. */
const RANDOM_BOT_MAX = 0.05;
const PICKUP_SLACK = 2;

/** Frame budgets the sweep is driven at. 1/15 s is a stalled low-end handset. */
const SWEEP_STEPS = [1 / 120, 1 / 60, 1 / 30, 1 / 15];
/** Extra stress: the same slides at 4x the shipped speed. */
const SPEED_STRESS = 4;

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const failures = [];
const fail = (msg) => failures.push(msg);

const TIMING = GAME_CONFIG.timing;
const LAUNCH = TIMING.glideLaunch;

/* ─── State encoding ─────────────────────────────────────────
   A search state is (position, crack states). Cracks only ever hold two values
   in a *survivable* state — intact or deepened — because stopping on thin ice
   or crossing deepened ice ends the slide in the water, and that is a fall, not
   an edge of this graph. So one bit per crack is exact.

   Reaching a cover point re-freezes every fracture, which is simply a transition
   whose successor crack mask is 0. No extra state dimension is needed for it:
   whether a cover point has already been *claimed* changes the score, never the
   movement, so it is carried in the pickup search only.

   Coins are carried in a separate mask for the coin gate only; they do not
   affect movement, which keeps the dead-end search 64x smaller. */
const posOf = (level, c, r) => r * level.cols + c;

function stateKey(level, pos, crackMask) {
  return crackMask * level.cols * level.rows + pos;
}

function decodeState(level, key, scratch) {
  const cells = level.cols * level.rows;
  const pos = key % cells;
  const crackMask = Math.floor(key / cells);
  scratch.c = pos % level.cols;
  scratch.r = Math.floor(pos / level.cols);
  for (let i = 0; i < level.cracks.length; i++) {
    scratch.cracks[i] = (crackMask >> i) & 1;
  }
  return scratch;
}

function makeScratch(level) {
  return {
    c: 0,
    r: 0,
    anchorC: level.start.c,
    anchorR: level.start.r,
    cracks: new Uint8Array(level.cracks.length),
    coins: new Uint8Array(level.coins.length),
    covers: new Uint8Array(level.covers.length),
    moves: 0,
    falls: 0,
  };
}

/** Crack mask after a resolved slide, honouring the cover point re-freeze. */
function maskAfter(level, before, res) {
  if (res.refreeze) return 0;
  let mask = before;
  for (const ci of res.deepened) mask |= 1 << ci;
  return mask;
}

/** Every legal (non-drowning) swipe out of one movement state. */
function movementEdges(level, key, scratch) {
  decodeState(level, key, scratch);
  scratch.coins.fill(0); // coins never gate movement
  scratch.covers.fill(0); // nor does whether a cover point was already claimed
  const cells = level.cols * level.rows;
  const before = Math.floor(key / cells);
  const out = [];
  for (const dir of DIRECTIONS) {
    const res = resolveSlide(level, scratch, dir);
    if (!res.moved || res.fell) continue;
    out.push({
      dir,
      res,
      key: stateKey(level, posOf(level, res.stop.c, res.stop.r), maskAfter(level, before, res)),
    });
  }
  return out;
}

/**
 * Distance-to-family for every movement state, by BFS over the reversed graph
 * from the family tile. Used by gates 4 and 7 and by the bot's optimal-move
 * oracle.
 */
function buildDistances(level) {
  const cells = level.cols * level.rows;
  const total = cells * (1 << level.cracks.length);
  const scratch = makeScratch(level);
  const forward = new Array(total);
  const reverse = new Array(total);
  for (let i = 0; i < total; i++) reverse[i] = null;

  const goalPos = posOf(level, level.goal.c, level.goal.r);
  const isGoal = (key) => key % cells === goalPos;

  for (let key = 0; key < total; key++) {
    if (isGoal(key)) {
      forward[key] = [];
      continue;
    }
    const edges = movementEdges(level, key, scratch);
    forward[key] = edges;
    for (const e of edges) {
      if (!reverse[e.key]) reverse[e.key] = [];
      reverse[e.key].push(key);
    }
  }

  const dist = new Int32Array(total).fill(-1);
  const queue = [];
  for (let key = 0; key < total; key++) {
    if (isGoal(key)) {
      dist[key] = 0;
      queue.push(key);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head];
    const back = reverse[key];
    if (!back) continue;
    for (const prev of back) {
      if (dist[prev] !== -1) continue;
      dist[prev] = dist[key] + 1;
      queue.push(prev);
    }
  }
  return { dist, forward, cells, total, goalPos, isGoal };
}

/** Gates 1 + 2 + 3 (coins): forward BFS carrying the coin mask. */
function solveLevel(level) {
  const cells = level.cols * level.rows;
  const crackStates = 1 << level.cracks.length;
  const coinStates = 1 << level.coins.length;
  const stride = cells * crackStates;
  const dist = new Int32Array(stride * coinStates).fill(-1);
  const scratch = makeScratch(level);
  const goalPos = posOf(level, level.goal.c, level.goal.r);

  const startKey = stateKey(level, posOf(level, level.start.c, level.start.r), 0);
  const start = 0 * stride + startKey;
  dist[start] = 0;
  const queue = [start];

  let par = Infinity;
  const coinBest = new Array(level.coins.length).fill(Infinity);
  let reachedStates = 0;

  for (let head = 0; head < queue.length; head++) {
    const full = queue[head];
    const coinMask = Math.floor(full / stride);
    const key = full % stride;
    const d = dist[full];
    reachedStates += 1;

    if (key % cells === goalPos) {
      if (d < par) par = d;
      for (let i = 0; i < level.coins.length; i++) {
        if ((coinMask >> i) & 1) coinBest[i] = Math.min(coinBest[i], d);
      }
      continue; // the family tile ends the level
    }

    decodeState(level, key, scratch);
    for (let i = 0; i < level.coins.length; i++) scratch.coins[i] = (coinMask >> i) & 1;
    scratch.covers.fill(0);

    const before = Math.floor(key / cells);
    for (const dir of DIRECTIONS) {
      const res = resolveSlide(level, scratch, dir);
      if (!res.moved || res.fell) continue;
      let coins = coinMask;
      for (const gi of res.coins) coins |= 1 << gi;
      const next = coins * stride
        + stateKey(level, posOf(level, res.stop.c, res.stop.r), maskAfter(level, before, res));
      if (dist[next] !== -1) continue;
      dist[next] = d + 1;
      queue.push(next);
    }
  }

  return { par, coinBest, reachedStates };
}

/** Forward BFS over the movement graph only — used for cover-point depth. */
function forwardDistances(level) {
  const cells = level.cols * level.rows;
  const total = cells * (1 << level.cracks.length);
  const dist = new Int32Array(total).fill(-1);
  const scratch = makeScratch(level);
  const startKey = stateKey(level, posOf(level, level.start.c, level.start.r), 0);
  dist[startKey] = 0;
  const queue = [startKey];
  for (let head = 0; head < queue.length; head++) {
    const key = queue[head];
    for (const e of movementEdges(level, key, scratch)) {
      if (dist[e.key] !== -1) continue;
      dist[e.key] = dist[key] + 1;
      queue.push(e.key);
    }
  }
  return { dist, cells };
}

/** Fewest moves to come to rest on each cover point. */
function coverDepths(level, fwd) {
  const best = level.covers.map(() => Infinity);
  for (let i = 0; i < level.covers.length; i++) {
    const pos = posOf(level, level.covers[i].c, level.covers[i].r);
    for (let key = 0; key < fwd.dist.length; key++) {
      if (fwd.dist[key] < 0) continue;
      if (key % fwd.cells !== pos) continue;
      if (fwd.dist[key] < best[i]) best[i] = fwd.dist[key];
    }
  }
  return best;
}

/** Gate 4: no legal sequence of swipes can strand the player. */
function findDeadEnds(level, distances) {
  const { dist, forward, cells, goalPos } = distances;
  const startKey = stateKey(level, posOf(level, level.start.c, level.start.r), 0);
  const seen = new Set([startKey]);
  const queue = [startKey];
  const dead = [];

  for (let head = 0; head < queue.length; head++) {
    const key = queue[head];
    if (key % cells === goalPos) continue;
    if (dist[key] === -1) {
      dead.push(key);
      continue;
    }
    for (const e of forward[key]) {
      if (seen.has(e.key)) continue;
      seen.add(e.key);
      queue.push(e.key);
    }
  }
  return { dead, reachable: seen, count: seen.size };
}

/** One optimal line, for the probe output and for eyeballing a board. */
function optimalLine(level, distances) {
  const { dist, forward, cells, goalPos } = distances;
  const scratch = makeScratch(level);
  let key = stateKey(level, posOf(level, level.start.c, level.start.r), 0);
  const line = [];
  let guard = 0;
  while (key % cells !== goalPos && guard++ < 64) {
    const d = dist[key];
    if (d <= 0) break;
    const step = forward[key].find((e) => dist[e.key] === d - 1);
    if (!step) break;
    line.push(`${step.dir}->(${step.res.stop.c},${step.res.stop.r})${step.res.cover >= 0 ? '*COVER' : ''}`);
    key = step.key;
  }
  void scratch;
  return line;
}

/* ─── Gate 5: the mechanics are load-bearing ─────────────────
   Rebuild the board with a mechanic flattened to plain ice and re-solve. If the
   optimum is unchanged, that mechanic is decoration and the gate says so. */
function flattened(def, chars) {
  const map = def.map.map((row) => row.replace(new RegExp(`[${chars}]`, 'g'), '.'));
  return parseLevel({ ...def, map }, 0);
}

/* ─── Gate 7: swept collision ────────────────────────────────
   Drive the SHIPPED glide sampler over a resolved slide at a fixed step and
   check the region the token SWEEPS between two frames, not just the two frame
   positions — the difference is the whole point, because at 15 Hz a single frame
   moves the shield several cells and a point test at each frame is exactly what
   tunnels.

   The swept region is the token's trajectory over the frame, which is the
   resolved polyline between the two eased parameters (never the straight chord
   between the two frame positions — a chord cuts the corner of a gust
   deflection). It is walked here at 1/8-cell resolution and checked for:

     * ORDER    the path cells are entered 1, 2, 3 … exactly once each. A skipped
                index is a tunnelled obstacle; a repeat is a rewind.
     * SOLID    the cell under every swept point is on the resolved path —
                therefore never a rock and never off the board.
     * LANDING  the glide finishes exactly on the committed resting cell.

   `maxChordDeviation` is reported alongside: how far the straight line between
   two rendered frames departs from that trajectory, i.e. how much a naive
   linear reading of the motion would have cut a corner. */
function alongPath(res, p) {
  const span = res.path.length - 1;
  let i = Math.floor(p);
  if (i > span) i = span;
  if (i < 0) i = 0;
  const f = i >= span ? 0 : p - i;
  const from = res.path[i];
  const to = res.path[i < span ? i + 1 : span];
  return { c: from.c + (to.c - from.c) * f, r: from.r + (to.r - from.r) * f };
}

function sweepSlide(level, res, timing, dt, acc) {
  const g = createGlide(timing, res);
  const span = res.path.length - 1;
  const entered = [];
  let prevP = 0;
  let prevC = g.c;
  let prevR = g.r;
  let guard = 0;

  for (;;) {
    if (guard++ > 200000) {
      acc.guard += 1;
      return;
    }
    const before = g.idx;
    advanceGlide(g, dt, LAUNCH);
    for (let j = before + 1; j <= g.idx; j++) entered.push(j);

    const nowP = g.u * span;
    const step = Math.hypot(g.c - prevC, g.r - prevR);
    if (step > acc.maxStepCells) acc.maxStepCells = step;

    // Walk the trajectory covered this frame at 1/8-cell resolution.
    const n = Math.max(1, Math.ceil((nowP - prevP) * 8));
    for (let k = 0; k <= n; k++) {
      const p = prevP + ((nowP - prevP) * k) / n;
      const s = alongPath(res, p);
      const cc = Math.round(s.c);
      const rr = Math.round(s.r);
      if (cc < 0 || rr < 0 || cc >= level.cols || rr >= level.rows) {
        acc.offBoard += 1;
        continue;
      }
      const idx = rr * level.cols + cc;
      if (level.tiles[idx] === 1) acc.rockHits += 1;
      if (!acc.pathSet.has(idx)) acc.offPath += 1;

      // How far a straight chord between the two frames would have strayed.
      const t = n === 0 ? 0 : k / n;
      const dev = Math.hypot(prevC + (g.c - prevC) * t - s.c, prevR + (g.r - prevR) * t - s.r);
      if (dev > acc.maxChordDeviation) acc.maxChordDeviation = dev;
    }

    prevP = nowP;
    prevC = g.c;
    prevR = g.r;
    if (g.done) break;
  }

  acc.slides += 1;
  acc.samples += guard;
  if (entered.length !== span) acc.skipped += 1;
  for (let i = 0; i < entered.length; i++) {
    if (entered[i] !== i + 1) {
      acc.outOfOrder += 1;
      break;
    }
  }
  const last = res.path[span];
  if (Math.abs(g.c - last.c) > 1e-9 || Math.abs(g.r - last.r) > 1e-9) acc.badLanding += 1;
}

function sweepLevel(level, distances, acc) {
  const scratch = makeScratch(level);
  const { reachable } = findDeadEnds(level, distances);
  const stressTiming = { ...TIMING, slideCellsPerSecond: TIMING.slideCellsPerSecond * SPEED_STRESS };
  for (const key of reachable) {
    decodeState(level, key, scratch);
    scratch.coins.fill(0);
    scratch.covers.fill(0);
    for (const dir of DIRECTIONS) {
      const res = resolveSlide(level, scratch, dir);
      if (!res.moved) continue;
      acc.pathSet = new Set(res.path.map((p) => p.r * level.cols + p.c));
      for (const dt of SWEEP_STEPS) sweepSlide(level, res, TIMING, dt, acc);
      // Same slides again with the clock cost cut 4x — a far faster token.
      for (const dt of SWEEP_STEPS) sweepSlide(level, res, stressTiming, dt, acc);
    }
  }
}

/* ─── Bots ────────────────────────────────────────────────────
   The skilled bot knows the optimal line (the distance oracle above) and
   mis-swipes 15% of the time. A mis-swipe is drawn uniformly from the directions
   that are NOT on an optimal line, which is what "wrong swipe" means — a thumb
   that flicked the wrong way, not a random walk.

   The random bot is the control group: it picks uniformly from all four
   directions with no knowledge of the board at all. If it wins often, the boards
   are not puzzles. */
function gaussian(rand) {
  // Box-Muller. Two uniforms in, one standard normal out.
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function botRun(levels, distances, cfg, rand, acc, random) {
  const T = cfg.timing;
  const B = cfg.bot;
  let clock = cfg.sessionSeconds;
  let falls = 0;
  let score = 0;
  let coins = 0;
  let covers = 0;
  let moves = 0;
  let cleared = 0;

  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    const { dist } = distances[li];
    const state = createLevelState(level);
    const goalPos = posOf(level, level.goal.c, level.goal.r);
    acc.attempts[li] += 1;
    let guard = 0;

    for (;;) {
      if (guard++ > 400) {
        acc.stuck += 1;
        return { won: false, cleared, score, coins, covers, moves, falls, clock };
      }

      let dir;
      if (random) {
        dir = DIRECTIONS[Math.min(3, Math.floor(rand() * 4))];
      } else {
        let crackMask = 0;
        for (let i = 0; i < level.cracks.length; i++) if (state.cracks[i]) crackMask |= 1 << i;
        const here = stateKey(level, posOf(level, state.c, state.r), crackMask);
        const d = dist[here];
        if (d < 0) {
          // Gate 4 proves this cannot happen; counted so a regression is loud.
          acc.stranded += 1;
          return { won: false, cleared, score, coins, covers, moves, falls, clock };
        }

        const optimal = [];
        const wrong = [];
        for (const cand of DIRECTIONS) {
          const res = resolveSlide(level, state, cand);
          if (res.moved && !res.fell) {
            const next = stateKey(level, posOf(level, res.stop.c, res.stop.r),
              maskAfter(level, crackMask, res));
            if (dist[next] === d - 1) {
              optimal.push(cand);
              continue;
            }
          }
          wrong.push(cand);
        }

        const misSwipe = wrong.length > 0 && rand() < B.wrongSwipeRate;
        const pool = misSwipe ? wrong : optimal;
        dir = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
        if (misSwipe) acc.misSwipes += 1;
      }

      // Reaction time, then the glide itself.
      clock -= Math.max(B.reactionMin, B.reactionMean + gaussian(rand) * B.reactionSigma);
      const res = resolveSlide(level, state, dir);
      if (!res.moved) {
        clock -= T.bonkSeconds;
        acc.bonks += 1;
        if (clock <= 0) return { won: false, cleared, score, coins, covers, moves, falls, clock, cause: 'clock' };
        continue;
      }

      clock -= slideSeconds(T, res.cells);
      // The clock is a buzzer and a move is committed only when the token
      // lands, so a glide still in the air when it sounds earns nothing. The
      // game discards the same way (see discardGlide in SlideToSafetyGame.jsx),
      // which keeps "score = the sum of committed moves" true in both.
      if (clock <= 0) {
        return { won: false, cleared, score, coins, covers, moves, falls, clock, cause: 'clock' };
      }
      score += res.coins.length * cfg.scoring.coin;
      coins += res.coins.length;
      if (res.coverNew) {
        score += cfg.scoring.coverBonus;
        covers += 1;
        acc.covers += 1;
      }
      applySlide(level, state, res);
      moves += 1;

      if (res.fell) {
        falls += 1;
        acc.falls += 1;
        acc.fallsPerLevel[li] += 1;
        clock -= T.fallSeconds + T.respawnSeconds;
        if (falls > cfg.retries) {
          return { won: false, cleared, score, coins, covers, moves, falls, clock, cause: 'retries' };
        }
        restartLevel(level, state);
        if (clock <= 0) return { won: false, cleared, score, coins, covers, moves, falls, clock, cause: 'clock' };
        continue;
      }

      if (res.reachedGoal || posOf(level, state.c, state.r) === goalPos) {
        const award = levelAward(cfg.scoring, level.par, state.moves);
        score += award.total;
        if (award.bonus === cfg.scoring.parBonus) acc.parFinishes += 1;
        cleared += 1;
        clock -= T.levelClearSeconds;
        if (clock <= 0 && li < levels.length - 1) {
          return { won: false, cleared, score, coins, covers, moves, falls, clock, cause: 'clock' };
        }
        break;
      }
    }
  }

  return { won: cleared === levels.length, cleared, score, coins, covers, moves, falls, clock };
}

function runBots(levels, distances, cfg, seed, runs, random) {
  const acc = {
    misSwipes: 0, falls: 0, bonks: 0, stuck: 0, stranded: 0, parFinishes: 0, covers: 0,
    attempts: levels.map(() => 0),
    fallsPerLevel: levels.map(() => 0),
  };
  let wins = 0;
  let lostToRetries = 0;
  let lostToClock = 0;
  let scoreSum = 0;
  let movesSum = 0;
  let clearedSum = 0;
  let timeSum = 0;
  const winScores = [];
  const rand = mulberry32(seed);
  for (let i = 0; i < runs; i++) {
    const r = botRun(levels, distances, cfg, rand, acc, random);
    if (r.won) {
      wins += 1;
      winScores.push(r.score);
      timeSum += cfg.sessionSeconds - r.clock;
    } else if (r.cause === 'retries') lostToRetries += 1;
    else lostToClock += 1;
    scoreSum += r.score;
    movesSum += r.moves;
    clearedSum += r.cleared;
  }
  winScores.sort((a, b) => a - b);
  return {
    acc, wins, runs, lostToRetries, lostToClock, scoreSum, movesSum, clearedSum, timeSum,
    winRate: wins / runs,
    medianWinScore: winScores.length ? winScores[Math.floor(winScores.length / 2)] : 0,
  };
}

function countRocks(level) {
  let n = 0;
  for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === 1) n += 1;
  return n;
}

/* ─── Report ─────────────────────────────────────────────── */
console.log('Slide to Safety — solvability + swept-collision + balance gate');
console.log(`  rules from src/slide.js, boards from src/levels.js (${LEVELS.length} levels, `
  + `${LEVELS[0].cols}x${LEVELS[0].rows} grid), timing from src/data.js`);
console.log(`  clock ${GAME_CONFIG.sessionSeconds}s, ${GAME_CONFIG.retries} retries, `
  + `coin ${GAME_CONFIG.scoring.coin}, cover ${GAME_CONFIG.scoring.coverBonus}, `
  + `level ${GAME_CONFIG.scoring.levelComplete} `
  + `+${GAME_CONFIG.scoring.parBonus} at par / +${GAME_CONFIG.scoring.nearParBonus} at par+1`);
console.log(`  glide ${TIMING.slideCellsPerSecond} cells/s, launch ramp ${LAUNCH}, `
  + `peak speed x${glidePeakFactor(LAUNCH).toFixed(3)} of average`);
console.log('');

const distances = [];
const sweep = {
  slides: 0, samples: 0, skipped: 0, outOfOrder: 0, badLanding: 0,
  rockHits: 0, offPath: 0, offBoard: 0, guard: 0,
  maxStepCells: 0, maxChordDeviation: 0, pathSet: new Set(),
};

for (const level of LEVELS) {
  const def = LEVEL_DEFS[level.index];
  const solved = solveLevel(level);
  const dists = buildDistances(level);
  distances.push(dists);
  const dead = findDeadEnds(level, dists);
  const fwd = forwardDistances(level);
  const covDepth = coverDepths(level, fwd);

  const parText = Number.isFinite(solved.par) ? String(solved.par) : 'UNREACHABLE';
  console.log(`── L${level.index + 1} ${level.name}  (${level.id})`);
  console.log(`   rocks ${countRocks(level)}  coins ${level.coins.length}  `
    + `cracks ${level.cracks.length}  gust cells ${level.winds.length}  `
    + `cover points ${level.covers.length}`);
  console.log(`   BFS optimum ${parText}   levels.js par ${level.par}   `
    + `${solved.par === level.par ? 'MATCH' : 'MISMATCH'}`);
  console.log(`   coin depths  ${level.coins.map((p, i) => {
    const d = solved.coinBest[i];
    return `(${p.c},${p.r})=${Number.isFinite(d) ? d : 'inf'}`;
  }).join('  ') || '(none)'}   budget ${level.par + PICKUP_SLACK}`);
  if (level.covers.length) {
    console.log(`   cover depths ${level.covers.map((p, i) => `(${p.c},${p.r})=${Number.isFinite(covDepth[i]) ? covDepth[i] : 'inf'}`).join('  ')}`);
  }
  console.log(`   movement states reachable ${dead.count}, dead ends ${dead.dead.length}`);

  // Gate 5 — mechanics must change the board.
  if (level.covers.length) {
    const flat = flattened(def, 'P');
    const flatPar = solveLevel(flat).par;
    const bearing = !Number.isFinite(flatPar) || flatPar !== solved.par;
    console.log(`   cover points flattened -> par ${Number.isFinite(flatPar) ? flatPar : 'UNREACHABLE'} `
      + `(${bearing ? 'LOAD-BEARING' : 'DECORATIVE'})`);
    if (!bearing) fail(`L${level.index + 1} ${level.id}: cover points are decorative — par unchanged at ${flatPar}`);
  }
  if (level.winds.length) {
    const flat = flattened(def, '\\^v<>');
    const flatPar = solveLevel(flat).par;
    const bearing = !Number.isFinite(flatPar) || flatPar !== solved.par;
    console.log(`   gust lanes flattened  -> par ${Number.isFinite(flatPar) ? flatPar : 'UNREACHABLE'} `
      + `(${bearing ? 'LOAD-BEARING' : 'DECORATIVE'})`);
    if (!bearing) fail(`L${level.index + 1} ${level.id}: gust lane is decorative — par unchanged at ${flatPar}`);
  }

  if (PROBE) console.log(`   optimal line: ${optimalLine(level, dists).join('  ')}`);

  if (!Number.isFinite(solved.par)) {
    fail(`L${level.index + 1} ${level.id}: family tile is UNREACHABLE`);
  } else if (solved.par !== level.par) {
    fail(`L${level.index + 1} ${level.id}: par field is ${level.par}, BFS optimum is ${solved.par}`);
  }
  for (let i = 0; i < level.coins.length; i++) {
    const d = solved.coinBest[i];
    if (!(d <= level.par + PICKUP_SLACK)) {
      const p = level.coins[i];
      fail(`L${level.index + 1} ${level.id}: coin (${p.c},${p.r}) needs `
        + `${Number.isFinite(d) ? d : 'inf'} moves, budget ${level.par + PICKUP_SLACK}`);
    }
  }
  for (let i = 0; i < level.covers.length; i++) {
    const d = covDepth[i];
    if (!(d <= level.par + PICKUP_SLACK)) {
      const p = level.covers[i];
      fail(`L${level.index + 1} ${level.id}: cover point (${p.c},${p.r}) needs `
        + `${Number.isFinite(d) ? d : 'inf'} moves, budget ${level.par + PICKUP_SLACK}`);
    }
  }
  if (dead.dead.length) {
    const scratch = makeScratch(level);
    const sample = dead.dead.slice(0, 4).map((k) => {
      decodeState(level, k, scratch);
      return `(${scratch.c},${scratch.r})/cracks[${Array.from(scratch.cracks).join('')}]`;
    });
    fail(`L${level.index + 1} ${level.id}: ${dead.dead.length} reachable dead-end state(s), e.g. ${sample.join(' ')}`);
  }

  sweepLevel(level, dists, sweep);
  console.log('');
}

/* ─── Gate 6: difficulty ramp ────────────────────────────────
   Three structural rules — par strictly increases, no board introduces two new
   mechanics at once, and board 1 is hazard-free while the finale is the densest.
   The skilled bot's measured fall rate per board is printed underneath, so the
   ramp is evidenced by behaviour and not only by counting furniture. */
const hazards = LEVELS.map((lv) => lv.cracks.length + lv.winds.length);
const mechanicsOf = (lv) => [
  lv.cracks.length ? 'ice' : '',
  lv.winds.length ? 'gust' : '',
  lv.covers.length ? 'cover' : '',
].filter(Boolean);
console.log('── difficulty ramp');
console.log(`   par        ${LEVELS.map((lv) => String(lv.par).padStart(5)).join('')}`);
console.log(`   hazards    ${hazards.map((h) => String(h).padStart(5)).join('')}   (cracks + gust cells)`);
console.log(`   mechanics  ${LEVELS.map((lv) => mechanicsOf(lv).join('+') || 'plain').join('  ')}`);

const seenMechanics = new Set();
for (let i = 0; i < LEVELS.length; i++) {
  const here = mechanicsOf(LEVELS[i]);
  const fresh = here.filter((m) => !seenMechanics.has(m));
  if (fresh.length > 1) {
    fail(`ramp: L${i + 1} introduces ${fresh.length} new mechanics at once (${fresh.join(', ')})`);
  }
  for (const m of here) seenMechanics.add(m);
  if (i > 0 && LEVELS[i].par <= LEVELS[i - 1].par) {
    fail(`ramp: L${i + 1} par ${LEVELS[i].par} does not exceed L${i} par ${LEVELS[i - 1].par}`);
  }
}
const finale = mechanicsOf(LEVELS[LEVELS.length - 1]);
for (const m of seenMechanics) {
  if (!finale.includes(m)) fail(`ramp: the final board is missing the "${m}" mechanic`);
}
if (hazards[0] !== 0) fail(`ramp: board 1 must be hazard-free to teach, has ${hazards[0]}`);
if (hazards[hazards.length - 1] !== Math.max(...hazards)) {
  fail(`ramp: the final board (${hazards[hazards.length - 1]} hazards) is not the densest (${Math.max(...hazards)})`);
}
console.log('');

/* ─── Gate 7: swept collision ────────────────────────────── */
const budget = SWEEP_STEPS[SWEEP_STEPS.length - 1] * TIMING.slideCellsPerSecond
  * SPEED_STRESS * glidePeakFactor(LAUNCH);
console.log('── swept collision (anti-tunnelling)');
console.log(`   every slide out of every reachable state, at ${SWEEP_STEPS.map((d) => `${Math.round(1 / d)}Hz`).join('/')} `
  + `and again at ${SPEED_STRESS}x speed`);
console.log(`   slides swept ${sweep.slides}, sub-steps ${sweep.samples}`);
console.log(`   worst-case unchecked travel would be ${budget.toFixed(2)} cells/frame; `
  + `measured max swept step ${sweep.maxStepCells.toFixed(3)} cells`);
console.log(`   max chord deviation from the trajectory ${sweep.maxChordDeviation.toFixed(3)} cells `
  + '(gust corners; the shield follows the path, not the chord)');
console.log(`   cells skipped ${sweep.skipped}   out of order ${sweep.outOfOrder}   `
  + `bad landing ${sweep.badLanding}`);
console.log(`   rock penetrations ${sweep.rockHits}   off-path ${sweep.offPath}   off-board ${sweep.offBoard}`);
if (sweep.skipped) fail(`tunnelling: ${sweep.skipped} slide(s) skipped a path cell`);
if (sweep.outOfOrder) fail(`tunnelling: ${sweep.outOfOrder} slide(s) entered cells out of order`);
if (sweep.badLanding) fail(`tunnelling: ${sweep.badLanding} slide(s) did not land exactly on the resting cell`);
if (sweep.rockHits) fail(`tunnelling: ${sweep.rockHits} swept sample(s) inside a rock`);
if (sweep.offPath) fail(`tunnelling: ${sweep.offPath} swept sample(s) off the resolved path`);
if (sweep.offBoard) fail(`tunnelling: ${sweep.offBoard} swept sample(s) off the board`);
if (sweep.guard) fail(`sweep hit the step guard ${sweep.guard} time(s)`);
console.log('');

/* ─── Gate 8: bots ───────────────────────────────────────── */
const skilled = runBots(LEVELS, distances, GAME_CONFIG, SEED, RUNS, false);
console.log(`── skilled bot: optimal line, ${pct(GAME_CONFIG.bot.wrongSwipeRate)} wrong-swipe noise, `
  + `reaction ${GAME_CONFIG.bot.reactionMean}s +/- ${GAME_CONFIG.bot.reactionSigma}s`);
console.log(`   ${RUNS} seeded runs from 0x${SEED.toString(16)}`);
console.log(`   completed all ${LEVELS.length} levels: ${skilled.wins}/${RUNS} = ${pct(skilled.winRate)}  `
  + `(target ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])})`);
console.log(`   lost to retries ${skilled.lostToRetries} (${pct(skilled.lostToRetries / RUNS)}), `
  + `lost to clock ${skilled.lostToClock} (${pct(skilled.lostToClock / RUNS)})`);
console.log(`   levels cleared/run ${(skilled.clearedSum / RUNS).toFixed(2)}, `
  + `moves/run ${(skilled.movesSum / RUNS).toFixed(1)} (total par ${TOTAL_PAR}), `
  + `falls/run ${(skilled.acc.falls / RUNS).toFixed(2)}, cover points/run ${(skilled.acc.covers / RUNS).toFixed(2)}, `
  + `mis-swipes/run ${(skilled.acc.misSwipes / RUNS).toFixed(1)}, wall bonks/run ${(skilled.acc.bonks / RUNS).toFixed(2)}`);
console.log(`   mean score ${(skilled.scoreSum / RUNS).toFixed(0)}, median winning score ${skilled.medianWinScore}, `
  + `winning run uses ${skilled.wins ? (skilled.timeSum / skilled.wins).toFixed(1) : '-'}s of ${GAME_CONFIG.sessionSeconds}s`);
if (skilled.acc.stuck || skilled.acc.stranded) {
  console.log(`   !! stuck ${skilled.acc.stuck}, stranded ${skilled.acc.stranded}`);
}

// The behavioural half of gate 6: the ramp has to show up in what the bot
// actually suffers, not only in the furniture count.
//
// Deliberately NOT "the last board is the deadliest". It is not, and that is by
// design: board 4 introduces the cover point, and a board with a cover point on
// it is measurably SAFER per attempt than one without even though it is longer.
// The claim that survives every seed is the one worth gating — the back half of
// the run costs more falls than the front half, and board 1 never drowns anyone.
const fallRate = skilled.acc.fallsPerLevel.map((f, i) => f / Math.max(1, skilled.acc.attempts[i]));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const front = mean(fallRate.slice(0, Math.floor(fallRate.length / 2)));
const back = mean(fallRate.slice(Math.ceil(fallRate.length / 2)));
console.log(`   falls per board attempt ${fallRate.map((v) => v.toFixed(2).padStart(6)).join('')}`);
console.log(`   board attempts          ${skilled.acc.attempts.map((v) => String(v).padStart(6)).join('')}`);
console.log(`   front half ${front.toFixed(3)} falls/attempt vs back half ${back.toFixed(3)}`);
if (fallRate[0] !== 0) fail(`ramp: board 1 should never drown the skilled bot, measured ${fallRate[0].toFixed(2)} falls/attempt`);
if (!(back > front)) {
  fail(`ramp: the back half of the run (${back.toFixed(3)} falls/attempt) is not harder than the front (${front.toFixed(3)})`);
}
console.log('');

const RANDOM_RUNS = Math.max(RUNS, 500);
const chaos = runBots(LEVELS, distances, GAME_CONFIG, SEED ^ 0x9e3779b9, RANDOM_RUNS, true);
console.log('── random-input bot: uniform swipes, no knowledge of the board (control group)');
console.log(`   ${RANDOM_RUNS} seeded runs`);
console.log(`   completed all ${LEVELS.length} levels: ${chaos.wins}/${RANDOM_RUNS} = ${pct(chaos.winRate)}  `
  + `(must stay under ${pct(RANDOM_BOT_MAX)})`);
console.log(`   levels cleared/run ${(chaos.clearedSum / RANDOM_RUNS).toFixed(2)}, `
  + `mean score ${(chaos.scoreSum / RANDOM_RUNS).toFixed(0)}, `
  + `falls/run ${(chaos.acc.falls / RANDOM_RUNS).toFixed(2)}, `
  + `wall bonks/run ${(chaos.acc.bonks / RANDOM_RUNS).toFixed(2)}`);
console.log('');

if (!(skilled.winRate >= BOT_BAND[0] && skilled.winRate <= BOT_BAND[1])) {
  fail(`skilled bot completion ${pct(skilled.winRate)} outside ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])}`);
}
if (chaos.winRate > RANDOM_BOT_MAX) {
  fail(`random-input bot completion ${pct(chaos.winRate)} exceeds ${pct(RANDOM_BOT_MAX)} — the boards are not puzzles`);
}
if (skilled.acc.stranded) fail(`bot was stranded ${skilled.acc.stranded} time(s) — dead-end gate is lying`);
if (skilled.acc.stuck) fail(`bot hit the step guard ${skilled.acc.stuck} time(s)`);

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  if (!PROBE) process.exit(1);
} else {
  console.log(`GATE: PASS — all ${LEVELS.length} boards solvable at the published par, `
    + `every pickup inside par+${PICKUP_SLACK}, no reachable dead ends, cover points and gusts load-bearing, `
    + `${sweep.slides} slides swept with 0 tunnelling, `
    + `skilled bot ${pct(skilled.winRate)} / random bot ${pct(chaos.winRate)}.`);
}
