// balance.mjs — solvability proof + balance gate for Slide to Safety.
//
// Imports the SHIPPING modules (src/levels.js, src/slide.js, src/data.js) and
// never re-implements a rule. Everything below is measured against the code the
// player actually runs.
//
//   node scripts/balance.mjs                # full gate, 300 bot seeds
//   node scripts/balance.mjs --runs 2000    # more seeds
//   node scripts/balance.mjs --probe        # diagnostics only, never exits 1
//
// GATES (all hard):
//   1. SOLVABLE      BFS over the slide graph reaches the family tile.
//   2. PAR           the `par` field in levels.js equals the BFS optimum.
//   3. COINS         every coin lies on at least one path of length <= par + 2.
//   4. NO DEAD ENDS  every state reachable by legal play — including every way
//                    the player can deepen thin ice — can still reach the family
//                    tile without drowning.
//   5. BOT           optimal-path bot with 15% wrong-swipe noise finishes all
//                    five levels inside the clock and the retries on 25-50% of
//                    seeded runs.
//
// Exit code is 1 if any gate fails, so this doubles as a regression gate on any
// level or rule change.

import { GAME_CONFIG } from '../src/data.js';
import { LEVELS, TOTAL_PAR } from '../src/levels.js';
import {
  DIRECTIONS,
  applySlide,
  createLevelState,
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

const BOT_BAND = [0.25, 0.5];
const COIN_SLACK = 2;

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const failures = [];
const fail = (msg) => failures.push(msg);

/* ─── State encoding ─────────────────────────────────────────
   A search state is (position, crack states). Cracks only ever hold two values
   in a *survivable* state — intact or deepened — because stopping on thin ice
   or crossing deepened ice ends the slide in the water, and that is a fall, not
   an edge of this graph. So one bit per crack is exact.

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
    cracks: new Uint8Array(level.cracks.length),
    coins: new Uint8Array(level.coins.length),
    moves: 0,
    falls: 0,
  };
}

/** Every legal (non-drowning) swipe out of one movement state. */
function movementEdges(level, key, scratch) {
  decodeState(level, key, scratch);
  scratch.coins.fill(0); // coins never gate movement
  const out = [];
  for (const dir of DIRECTIONS) {
    const res = resolveSlide(level, scratch, dir);
    if (!res.moved || res.fell) continue;
    let mask = 0;
    for (let i = 0; i < level.cracks.length; i++) {
      if (scratch.cracks[i]) mask |= 1 << i;
    }
    for (const ci of res.deepened) mask |= 1 << ci;
    out.push({ dir, res, key: stateKey(level, posOf(level, res.stop.c, res.stop.r), mask) });
  }
  return out;
}

/**
 * Distance-to-family for every movement state, by BFS over the reversed graph
 * from the family tile. Used by gate 4 and by the bot's optimal-move oracle.
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

/** Gate 1 + 2 + 3: forward BFS carrying the coin mask. */
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

    for (const dir of DIRECTIONS) {
      const res = resolveSlide(level, scratch, dir);
      if (!res.moved || res.fell) continue;
      let cracks = Math.floor(key / cells);
      for (const ci of res.deepened) cracks |= 1 << ci;
      let coins = coinMask;
      for (const gi of res.coins) coins |= 1 << gi;
      const next = coins * stride + stateKey(level, posOf(level, res.stop.c, res.stop.r), cracks);
      if (dist[next] !== -1) continue;
      dist[next] = d + 1;
      queue.push(next);
    }
  }

  return { par, coinBest, reachedStates };
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
  return { dead, reachable: seen.size };
}

/* ─── The bot ─────────────────────────────────────────────────
   Knows the optimal line (the distance oracle above) and mis-swipes 15% of the
   time. A mis-swipe is drawn uniformly from the directions that are NOT on an
   optimal line, which is what "wrong swipe" means — a thumb that flicked the
   wrong way, not a random walk. Some mis-swipes are harmless, some cost two
   moves to undo, and some put the token onto thin ice. */
function gaussian(rand) {
  // Box-Muller. Two uniforms in, one standard normal out.
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function botRun(levels, distances, cfg, rand, acc) {
  const T = cfg.timing;
  const B = cfg.bot;
  let clock = cfg.sessionSeconds;
  let falls = 0;
  let score = 0;
  let coins = 0;
  let moves = 0;
  let cleared = 0;

  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    const { dist, cells } = distances[li];
    const state = createLevelState(level);
    const goalPos = posOf(level, level.goal.c, level.goal.r);
    let guard = 0;

    for (;;) {
      if (guard++ > 400) {
        acc.stuck += 1;
        return { won: false, cleared, score, coins, moves, falls, clock };
      }

      let crackMask = 0;
      for (let i = 0; i < level.cracks.length; i++) if (state.cracks[i]) crackMask |= 1 << i;
      const here = stateKey(level, posOf(level, state.c, state.r), crackMask);
      const d = dist[here];
      if (d < 0) {
        // Gate 4 proves this cannot happen; counted so a regression is loud.
        acc.stranded += 1;
        return { won: false, cleared, score, coins, moves, falls, clock };
      }

      const optimal = [];
      const wrong = [];
      for (const dir of DIRECTIONS) {
        const res = resolveSlide(level, state, dir);
        if (res.moved && !res.fell) {
          let mask = crackMask;
          for (const ci of res.deepened) mask |= 1 << ci;
          const next = stateKey(level, posOf(level, res.stop.c, res.stop.r), mask);
          if (dist[next] === d - 1) {
            optimal.push(dir);
            continue;
          }
        }
        wrong.push(dir);
      }

      const misSwipe = wrong.length > 0 && rand() < B.wrongSwipeRate;
      const pool = misSwipe ? wrong : optimal;
      const dir = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
      if (misSwipe) acc.misSwipes += 1;

      // Reaction time, then the glide itself.
      clock -= Math.max(B.reactionMin, B.reactionMean + gaussian(rand) * B.reactionSigma);
      const res = resolveSlide(level, state, dir);
      if (!res.moved) {
        clock -= T.bonkSeconds;
        acc.bonks += 1;
        if (clock <= 0) return { won: false, cleared, score, coins, moves, falls, clock };
        continue;
      }

      clock -= slideSeconds(T, res.cells);
      // The clock is a buzzer and a move is committed only when the token
      // lands, so a glide still in the air when it sounds earns nothing. The
      // game discards the same way (see discardGlide in SlideToSafetyGame.jsx),
      // which keeps "score = the sum of committed moves" true in both.
      if (clock <= 0) {
        return { won: false, cleared, score, coins, moves, falls, clock, cause: 'clock' };
      }
      score += res.coins.length * cfg.scoring.coin;
      coins += res.coins.length;
      applySlide(level, state, res);
      moves += 1;

      if (res.fell) {
        falls += 1;
        acc.falls += 1;
        clock -= T.fallSeconds + T.respawnSeconds;
        if (falls > cfg.retries) {
          return { won: false, cleared, score, coins, moves, falls, clock, cause: 'retries' };
        }
        restartLevel(level, state);
        if (clock <= 0) return { won: false, cleared, score, coins, moves, falls, clock, cause: 'clock' };
        continue;
      }

      if (res.reachedGoal || posOf(level, state.c, state.r) === goalPos) {
        const award = levelAward(cfg.scoring, level.par, state.moves);
        score += award.total;
        if (award.bonus === cfg.scoring.parBonus) acc.parFinishes += 1;
        cleared += 1;
        clock -= T.levelClearSeconds;
        if (clock <= 0 && li < levels.length - 1) {
          return { won: false, cleared, score, coins, moves, falls, clock, cause: 'clock' };
        }
        break;
      }
    }
    void cells;
  }

  return { won: cleared === levels.length, cleared, score, coins, moves, falls, clock };
}

/* ─── Report ─────────────────────────────────────────────── */
console.log('Slide to Safety — solvability + balance gate');
console.log(`  rules from src/slide.js, boards from src/levels.js (${LEVELS.length} levels, `
  + `${LEVELS[0].cols}x${LEVELS[0].rows} grid), timing from src/data.js`);
console.log(`  clock ${GAME_CONFIG.sessionSeconds}s, ${GAME_CONFIG.retries} retries, `
  + `coin ${GAME_CONFIG.scoring.coin}, level ${GAME_CONFIG.scoring.levelComplete} `
  + `+${GAME_CONFIG.scoring.parBonus} at par / +${GAME_CONFIG.scoring.nearParBonus} at par+1`);
console.log('');

const distances = [];

for (const level of LEVELS) {
  const solved = solveLevel(level);
  const dists = buildDistances(level);
  distances.push(dists);
  const dead = findDeadEnds(level, dists);

  const parText = Number.isFinite(solved.par) ? String(solved.par) : 'UNREACHABLE';
  console.log(`── L${level.index + 1} ${level.name}  (${level.id})`);
  console.log(`   rocks ${countRocks(level)}  coins ${level.coins.length}  `
    + `cracks ${level.cracks.length}  gust cells ${level.winds.length}`);
  console.log(`   BFS optimum ${parText}   levels.js par ${level.par}   `
    + `${solved.par === level.par ? 'MATCH' : 'MISMATCH'}`);
  console.log(`   coin depths  ${level.coins.map((p, i) => {
    const d = solved.coinBest[i];
    return `(${p.c},${p.r})=${Number.isFinite(d) ? d : 'inf'}`;
  }).join('  ')}   budget ${level.par + COIN_SLACK}`);
  console.log(`   movement states reachable ${dead.reachable}, dead ends ${dead.dead.length}`);

  if (!Number.isFinite(solved.par)) {
    fail(`L${level.index + 1} ${level.id}: family tile is UNREACHABLE`);
  } else if (solved.par !== level.par) {
    fail(`L${level.index + 1} ${level.id}: par field is ${level.par}, BFS optimum is ${solved.par}`);
  }
  for (let i = 0; i < level.coins.length; i++) {
    const d = solved.coinBest[i];
    if (!(d <= level.par + COIN_SLACK)) {
      const p = level.coins[i];
      fail(`L${level.index + 1} ${level.id}: coin (${p.c},${p.r}) needs `
        + `${Number.isFinite(d) ? d : 'inf'} moves, budget ${level.par + COIN_SLACK}`);
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
  console.log('');
}

function countRocks(level) {
  let n = 0;
  for (let i = 0; i < level.tiles.length; i++) if (level.tiles[i] === 1) n += 1;
  return n;
}

/* ─── Bot ────────────────────────────────────────────────── */
const acc = {
  misSwipes: 0, falls: 0, bonks: 0, stuck: 0, stranded: 0, parFinishes: 0,
};
let wins = 0;
let lostToRetries = 0;
let lostToClock = 0;
let scoreSum = 0;
let movesSum = 0;
let clearedSum = 0;
let timeSum = 0;
const winScores = [];

const rand = mulberry32(SEED);
for (let i = 0; i < RUNS; i++) {
  const r = botRun(LEVELS, distances, GAME_CONFIG, rand, acc);
  if (r.won) {
    wins += 1;
    winScores.push(r.score);
    timeSum += GAME_CONFIG.sessionSeconds - r.clock;
  } else if (r.cause === 'retries') lostToRetries += 1;
  else lostToClock += 1;
  scoreSum += r.score;
  movesSum += r.moves;
  clearedSum += r.cleared;
}

const winRate = wins / RUNS;
winScores.sort((a, b) => a - b);
const medianWinScore = winScores.length ? winScores[Math.floor(winScores.length / 2)] : 0;

console.log(`── bot: optimal line, ${pct(GAME_CONFIG.bot.wrongSwipeRate)} wrong-swipe noise, `
  + `reaction ${GAME_CONFIG.bot.reactionMean}s +/- ${GAME_CONFIG.bot.reactionSigma}s`);
console.log(`   ${RUNS} seeded runs from 0x${SEED.toString(16)}`);
console.log(`   completed all ${LEVELS.length} levels: ${wins}/${RUNS} = ${pct(winRate)}  `
  + `(target ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])})`);
console.log(`   lost to retries ${lostToRetries} (${pct(lostToRetries / RUNS)}), `
  + `lost to clock ${lostToClock} (${pct(lostToClock / RUNS)})`);
console.log(`   levels cleared/run ${(clearedSum / RUNS).toFixed(2)}, `
  + `moves/run ${(movesSum / RUNS).toFixed(1)} (total par ${TOTAL_PAR}), `
  + `falls/run ${(acc.falls / RUNS).toFixed(2)}, mis-swipes/run ${(acc.misSwipes / RUNS).toFixed(1)}, `
  + `wall bonks/run ${(acc.bonks / RUNS).toFixed(2)}`);
console.log(`   mean score ${(scoreSum / RUNS).toFixed(0)}, median winning score ${medianWinScore}, `
  + `winning run uses ${wins ? (timeSum / wins).toFixed(1) : '-'}s of ${GAME_CONFIG.sessionSeconds}s`);
if (acc.stuck || acc.stranded) {
  console.log(`   !! stuck ${acc.stuck}, stranded ${acc.stranded}`);
}
console.log('');

if (!(winRate >= BOT_BAND[0] && winRate <= BOT_BAND[1])) {
  fail(`bot completion ${pct(winRate)} outside ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])}`);
}
if (acc.stranded) fail(`bot was stranded ${acc.stranded} time(s) — dead-end gate is lying`);
if (acc.stuck) fail(`bot hit the step guard ${acc.stuck} time(s)`);

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  if (!PROBE) process.exit(1);
} else {
  console.log(`GATE: PASS — all ${LEVELS.length} boards solvable at the published par, `
    + `every coin inside par+${COIN_SLACK}, no reachable dead ends, `
    + `bot completion ${pct(winRate)}.`);
}
