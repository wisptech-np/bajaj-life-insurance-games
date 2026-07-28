// flow.js — the pipe-network rules of Income Pipeline, as pure data.
//
// No React, no DOM, no canvas, no image or colour imports. IncomePipelineGame.jsx
// draws whatever this file says the board is doing, and scripts/balance.mjs
// imports this exact module under Node — so the balance table is measured
// against the code that ships rather than a re-implementation that can silently
// drift from it. Keep it that way: if you need a colour or a pixel in here, the
// thing you are writing belongs in the component.
//
// Sides are indexed clockwise from north, which is what makes a 90-degree
// clockwise tap a single-bit rotate of the port mask.

export const N = 0;
export const E = 1;
export const S = 2;
export const W = 3;

/** Column / row deltas per side, and the side you arrive from. */
export const DC = [0, 1, 0, -1];
export const DR = [-1, 0, 1, 0];
export const OPP = [2, 3, 0, 1];

/** Port mask of each tile type at rotation 0. Bit i set = side i is open. */
export const TILE_BASE = {
  straight: 0b0101, // N | S
  elbow: 0b0011, // N | E
  tee: 0b0111, // N | E | S
  cross: 0b1111, // every side
};

/**
 * How many DISTINCT masks a type has. A straight looks the same every 180
 * degrees and a cross every 90, so a cross is effectively a fixed junction:
 * tapping it can never change the board, which is why the component draws it
 * locked and refuses the tap instead of charging the player a move for nothing.
 */
export const TILE_STATES = { straight: 2, elbow: 4, tee: 4, cross: 1 };

export const TILE_TYPES = ['straight', 'elbow', 'tee', 'cross'];

/* ─── Small deterministic PRNG ───────────────────────────────
   Seeded so a headless run — and a reported bug — can be reproduced exactly. */
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

/* ─── Masks and rotation ─────────────────────────────────── */

/** Rotate a port mask `rot` quarter-turns clockwise. */
export function rotateMask(mask, rot) {
  const r = ((rot % 4) + 4) % 4;
  return ((mask << r) | (mask >> (4 - r))) & 0b1111;
}

export function maskOf(cell) {
  return rotateMask(TILE_BASE[cell.type], cell.rot);
}

export function hasPort(mask, side) {
  return ((mask >> side) & 1) === 1;
}

export function isLocked(cell) {
  return TILE_STATES[cell.type] <= 1;
}

/** Taps needed to bring `cell` to the mask it has at rotation `targetRot`. */
export function tapsTo(cell, targetRot) {
  const states = TILE_STATES[cell.type];
  if (states <= 1) return 0;
  return (((targetRot - cell.rot) % states) + states) % states;
}

export function cellIndex(level, col, row) {
  return row * level.cols + col;
}

export function cloneLevel(level) {
  return {
    ...level,
    cells: level.cells.map((c) => ({ type: c.type, rot: c.rot })),
  };
}

/** Apply one clockwise tap. Returns false when the tile is a fixed junction. */
export function tapCell(level, index) {
  const cell = level.cells[index];
  if (!cell || isLocked(cell)) return false;
  cell.rot = (cell.rot + 1) & 3;
  return true;
}

/* ─── Flow resolution ────────────────────────────────────────
   The scratch object exists so the greedy bot — which resolves the whole board
   a few hundred times per level — allocates nothing per evaluation, and so the
   component can resolve a board inside a frame without handing the collector
   work mid-animation. */
export function createFlowScratch(cols, rows, tankCount = 3) {
  const n = cols * rows;
  return {
    n,
    masks: new Uint8Array(n),
    reached: new Uint8Array(n),
    fromSide: new Int8Array(n),
    depth: new Int16Array(n),
    order: new Int16Array(n),
    orderCount: 0,
    // Packed cell * 4 + side, so a leak knows exactly which pipe end sprays.
    leakEnds: new Int16Array(n * 4),
    leakCount: 0,
    tankFilled: new Uint8Array(Math.max(1, tankCount)),
    tankDepth: new Int16Array(Math.max(1, tankCount)),
    tanksFilled: 0,
    reachedCount: 0,
    maxDepth: 0,
  };
}

/**
 * Resolve one board: where the money goes, which tanks fill, where it sprays.
 *
 * Two pipes join only when BOTH faces are open — a pipe end butting a sealed
 * face is a leak, not a joint, which is the rule that makes a half-finished
 * board cost money instead of merely failing.
 *
 * `out` is a scratch object from createFlowScratch(); it is mutated and
 * returned. BFS depth doubles as the animation clock: every cell at depth d
 * fills on the same wavefront.
 */
export function computeFlow(level, out) {
  const { cols, rows, cells, tanks } = level;
  const n = cols * rows;
  const masks = out.masks;
  const reached = out.reached;
  const fromSide = out.fromSide;
  const depth = out.depth;
  const order = out.order;

  for (let i = 0; i < n; i++) {
    masks[i] = rotateMask(TILE_BASE[cells[i].type], cells[i].rot);
    reached[i] = 0;
    fromSide[i] = -1;
    depth[i] = -1;
  }
  for (let t = 0; t < out.tankFilled.length; t++) {
    out.tankFilled[t] = 0;
    out.tankDepth[t] = -1;
  }
  out.orderCount = 0;
  out.leakCount = 0;
  out.tanksFilled = 0;
  out.maxDepth = 0;

  const start = level.sourceRow * cols;
  if (hasPort(masks[start], W)) {
    reached[start] = 1;
    fromSide[start] = W;
    depth[start] = 0;
    order[out.orderCount++] = start;

    for (let qi = 0; qi < out.orderCount; qi++) {
      const i = order[qi];
      const c = i % cols;
      const r = (i - c) / cols;
      const m = masks[i];
      for (let d = 0; d < 4; d++) {
        if (((m >> d) & 1) === 0) continue;
        const nc = c + DC[d];
        const nr = r + DR[d];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const j = nr * cols + nc;
        if (reached[j]) continue;
        if (((masks[j] >> OPP[d]) & 1) === 0) continue;
        reached[j] = 1;
        fromSide[j] = OPP[d];
        depth[j] = depth[i] + 1;
        if (depth[j] > out.maxDepth) out.maxDepth = depth[j];
        order[out.orderCount++] = j;
      }
    }
  }
  out.reachedCount = out.orderCount;

  // Second pass: every open end on the live network is either the salary
  // inlet, a tank mouth, a joint, or money on the floor.
  const lastCol = cols - 1;
  for (let qi = 0; qi < out.orderCount; qi++) {
    const i = order[qi];
    const c = i % cols;
    const r = (i - c) / cols;
    const m = masks[i];
    for (let d = 0; d < 4; d++) {
      if (((m >> d) & 1) === 0) continue;
      const nc = c + DC[d];
      const nr = r + DR[d];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
        if (d === W && c === 0 && r === level.sourceRow) continue; // salary inlet
        if (d === E && c === lastCol) {
          const t = level.tankRowOf[r];
          if (t >= 0) {
            if (!out.tankFilled[t]) {
              out.tankFilled[t] = 1;
              out.tankDepth[t] = depth[i];
              out.tanksFilled += 1;
            }
            continue;
          }
        }
        out.leakEnds[out.leakCount++] = i * 4 + d;
        continue;
      }
      const j = nr * cols + nc;
      if (((masks[j] >> OPP[d]) & 1) === 1) continue; // joined
      out.leakEnds[out.leakCount++] = i * 4 + d;
    }
  }

  out.tankCount = tanks.length;
  return out;
}

/** True when every tank on this level would fill right now. */
export function isLevelSolved(level, scratch) {
  const s = scratch || createFlowScratch(level.cols, level.rows, level.tanks.length);
  computeFlow(level, s);
  return s.tanksFilled === level.tanks.length;
}

/** What one resolved level is worth. `remaining` is whole seconds on the clock. */
export function scoreLevel(cfg, tanksFilled, leaks, remaining, early) {
  const sc = cfg.scoring;
  const tankPoints = tanksFilled * sc.tankFilled;
  const leakPoints = leaks * sc.leakPenalty;
  const bonus = early ? Math.max(0, Math.floor(remaining)) * sc.earlyBonusPerSecond : 0;
  return { tankPoints, leakPoints, bonus, total: tankPoints - leakPoints + bonus };
}

/* ─── Exact optimal solver ───────────────────────────────────
   minRotationsToSolve() is the balance gate's par: the fewest taps that turn
   this board into one where every tank fills.

   A naive BFS over rotation states is not an option — a 6x6 board has 4^36
   states — but the problem has structure that collapses it. Taps are per-tile
   and independent, and the win condition only asks for CONNECTIVITY, so every
   tile outside the eventual network can simply be left alone at zero cost. What
   is left is a minimum-cost tree spanning the salary inlet and every tank
   mouth, where a tile's cost depends on which rotation it ends up in.

   That is node-weighted Steiner tree with port-dependent node costs, which the
   Dreyfus-Wagner DP solves exactly: dp[S][v][r] is the cheapest tree that spans
   terminal subset S, contains tile v, and leaves v at rotation r. Subsets grow
   by merging two smaller subsets at a shared tile, and by Dijkstra relaxation
   along the grid — Dijkstra rather than plain BFS because a tap costs 1..3
   depending on how far the tile has to swing. With 4 terminals, 36 tiles and 4
   rotations that is 16 x 144 states: exact, and about a millisecond.

   The result is stronger than the brief's "not already-solved (>= 4 rotations
   from solution)": it is the distance to the NEAREST solution, decoy shortcuts
   included, so a scramble cannot sneak past the gate by accidentally being
   solvable a different way. */

/** Binary min-heap over packed (dist * stateCount + stateIndex) integers. */
function heapPush(h, value) {
  let i = h.length;
  h.push(value);
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p] <= h[i]) break;
    const tmp = h[p];
    h[p] = h[i];
    h[i] = tmp;
    i = p;
  }
}

function heapPop(h) {
  const top = h[0];
  const last = h.pop();
  if (h.length > 0) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < h.length && h[l] < h[m]) m = l;
      if (r < h.length && h[r] < h[m]) m = r;
      if (m === i) break;
      const tmp = h[m];
      h[m] = h[i];
      h[i] = tmp;
      i = m;
    }
  }
  return top;
}

const INF = 0x3fffffff;

export function minRotationsToSolve(level) {
  const { cols, rows, cells } = level;
  const n = cols * rows;
  const size = n * 4;

  const cost = new Int32Array(size);
  const rmask = new Uint8Array(size);
  const valid = new Uint8Array(size);

  const srcCell = level.sourceRow * cols;
  const terminals = [srcCell];
  for (const t of level.tanks) terminals.push(t.row * cols + (cols - 1));
  const m = terminals.length;

  for (let i = 0; i < n; i++) {
    const base = TILE_BASE[cells[i].type];
    const cur = cells[i].rot;
    for (let r = 0; r < 4; r++) {
      const x = i * 4 + r;
      const mask = rotateMask(base, r);
      rmask[x] = mask;
      cost[x] = (r - cur + 4) & 3;
      let ok = 1;
      if (i === srcCell && ((mask >> W) & 1) === 0) ok = 0;
      if (ok && i % cols === cols - 1) {
        const t = level.tankRowOf[(i - (cols - 1)) / cols];
        if (t >= 0 && ((mask >> E) & 1) === 0) ok = 0;
      }
      valid[x] = ok;
    }
  }

  const full = (1 << m) - 1;
  const dp = [];
  for (let S = 0; S <= full; S++) dp.push(new Int32Array(size).fill(INF));

  for (let k = 0; k < m; k++) {
    const v = terminals[k];
    for (let r = 0; r < 4; r++) {
      const x = v * 4 + r;
      if (valid[x]) dp[1 << k][x] = cost[x];
    }
  }

  // Subsets in increasing popcount order: a merge only ever reads strictly
  // smaller subsets, so a single ascending pass over the bitmask is enough
  // (every proper submask of S is numerically smaller than S).
  const heap = [];
  const done = new Uint8Array(size);
  for (let S = 1; S <= full; S++) {
    const cur = dp[S];

    for (let sub = (S - 1) & S; sub > 0; sub = (sub - 1) & S) {
      const other = S ^ sub;
      if (sub > other) continue; // each split once
      const a = dp[sub];
      const b = dp[other];
      for (let x = 0; x < size; x++) {
        if (a[x] >= INF || b[x] >= INF) continue;
        const v = a[x] + b[x] - cost[x];
        if (v < cur[x]) cur[x] = v;
      }
    }

    heap.length = 0;
    done.fill(0);
    for (let x = 0; x < size; x++) {
      if (cur[x] < INF) heapPush(heap, cur[x] * size + x);
    }
    while (heap.length > 0) {
      const top = heapPop(heap);
      const x = top % size;
      const d = (top - x) / size;
      if (done[x] || d > cur[x]) continue;
      done[x] = 1;

      const v = (x - (x & 3)) / 4;
      const mask = rmask[x];
      const c = v % cols;
      const row = (v - c) / cols;
      for (let side = 0; side < 4; side++) {
        if (((mask >> side) & 1) === 0) continue;
        const nc = c + DC[side];
        const nr = row + DR[side];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const u = nr * cols + nc;
        for (let r2 = 0; r2 < 4; r2++) {
          const y = u * 4 + r2;
          if (!valid[y]) continue;
          if (((rmask[y] >> OPP[side]) & 1) === 0) continue;
          const nd = d + cost[y];
          if (nd < cur[y]) {
            cur[y] = nd;
            heapPush(heap, nd * size + y);
          }
        }
      }
    }
  }

  let best = INF;
  const finalDp = dp[full];
  for (let x = 0; x < size; x++) if (finalDp[x] < best) best = finalDp[x];
  return best >= INF ? Infinity : best;
}

/** Taps that would restore the board to the layout it was generated from. */
export function scrambleDistance(level) {
  let total = 0;
  for (let i = 0; i < level.cells.length; i++) {
    total += tapsTo(level.cells[i], level.solvedRots[i]);
  }
  return total;
}

/* ─── Bots (used only by scripts/balance.mjs) ────────────────
   Both bots drive the same tapCell()/computeFlow() pair the game does, so a
   rule change is measured the moment it lands. */

/**
 * Can this tile type be turned so that a drop entering from `a` leaves by `b`?
 * Types never change, so this is a property of the board, not of a position:
 * a straight can only go through, an elbow can only turn, a tee and a cross can
 * do either. Opposite sides differ by exactly 2 in the clockwise indexing.
 */
export function canPass(type, a, b) {
  if (a === b) return false;
  const opposite = (a ^ b) === 2;
  if (type === 'straight') return opposite;
  if (type === 'elbow') return !opposite;
  return true; // tee, cross
}

const RELAXED_BIG = 1000;

/**
 * Per-tank table of "how many more tiles, at best, from here to that tank" —
 * indexed by (tile, side the flow arrives from) and computed with every tile
 * free to rotate. It is a relaxation, not a plan: it ignores what each tile
 * currently shows, ignores how many taps a tile would cost, and ignores that
 * one tile cannot serve two branches in two different shapes. Types are fixed,
 * so it is built once per board and reused for every evaluation.
 */
export function buildRelaxedDistances(level) {
  const { cols, rows, cells, tanks } = level;
  const n = cols * rows;
  const tables = [];
  const queue = new Int32Array(n * 4);

  for (let t = 0; t < tanks.length; t++) {
    const dist = new Int16Array(n * 4).fill(RELAXED_BIG);
    let qh = 0;
    let qt = 0;
    const mouth = tanks[t].row * cols + (cols - 1);
    for (let s = 0; s < 4; s++) {
      if (!canPass(cells[mouth].type, s, E)) continue;
      dist[mouth * 4 + s] = 0;
      queue[qt++] = mouth * 4 + s;
    }
    while (qh < qt) {
      const st = queue[qh++];
      const sj = st & 3;
      const j = (st - sj) / 4;
      const d = dist[st];
      // The tile that would feed (j entered from sj) sits on side sj of j and
      // must be able to send the drop out of its opposite face.
      const jc = j % cols;
      const ic = jc + DC[sj];
      const ir = (j - jc) / cols + DR[sj];
      if (ic < 0 || ic >= cols || ir < 0 || ir >= rows) continue;
      const i = ir * cols + ic;
      const out = OPP[sj];
      const type = cells[i].type;
      for (let s = 0; s < 4; s++) {
        if (!canPass(type, s, out)) continue;
        const idx = i * 4 + s;
        if (dist[idx] <= d + 1) continue;
        dist[idx] = d + 1;
        queue[qt++] = idx;
      }
    }
    tables.push(dist);
  }
  return tables;
}

/**
 * How good this board looks to a myopic solver.
 *
 * The subtle part is the distance term, and a naive "how close is the live flow
 * to the tank" heuristic does not work here. Two neighbouring tiles must BOTH
 * open toward each other before a single drop crosses between them, so no
 * single rotation ever moves the live flow one cell closer: turning the frontier
 * tile achieves nothing until the next tile turns, and turning the next tile
 * achieves nothing until the frontier does. A hill-climber on live flow alone
 * sees a flat plateau everywhere and collapses into a random walk (measured:
 * 5% of seeds solved).
 *
 * The fix is to score the half-finished join. Let A be the relaxed tile-distance
 * from the live flow to the tank, and let the board be "aimed" when some live
 * pipe end already sprays into a tile that is strictly closer than A. Then
 *
 *     cost = 2A - (aimed ? 1 : 0)
 *
 * falls by exactly one on the tap that aims the frontier, and by one again on
 * the tap that accepts the spray — a real one-tap-at-a-time gradient with no
 * lookahead behind it.
 *
 * The bot stays thoroughly myopic. The relaxation lets it believe a route is
 * open when the tiles on it are needed in two different shapes at once, when
 * they would cost three taps each, or when a branch to a second tank has
 * already claimed them. Discovering that costs taps against the payday clock,
 * and that is what the win-rate band is made of.
 */
export function boardScore(level, scratch, weights, relaxed) {
  const f = computeFlow(level, scratch);
  let score = weights.tank * f.tanksFilled + weights.reached * f.reachedCount - weights.leak * f.leakCount;

  const cols = level.cols;
  const rows = level.rows;
  const cap = cols + rows;

  for (let t = 0; t < level.tanks.length; t++) {
    if (f.tankFilled[t]) continue;
    const dist = relaxed[t];

    let A = RELAXED_BIG;
    if (f.orderCount === 0) {
      A = dist[level.sourceRow * cols * 4 + W];
    } else {
      for (let qi = 0; qi < f.orderCount; qi++) {
        const i = f.order[qi];
        const d = dist[i * 4 + f.fromSide[i]];
        if (d < A) A = d;
      }
    }

    let aimed = 0;
    if (A > 0 && f.orderCount > 0) {
      for (let k = 0; k < f.leakCount; k++) {
        const packed = f.leakEnds[k];
        const side = packed & 3;
        const i = (packed - side) / 4;
        const c = i % cols;
        const nc = c + DC[side];
        const nr = (i - c) / cols + DR[side];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        if (dist[(nr * cols + nc) * 4 + OPP[side]] < A) {
          aimed = 1;
          break;
        }
      }
    }

    score -= weights.distance * (2 * Math.min(A, cap) - aimed);
  }
  return score;
}

/**
 * Greedy solver bot — the casual-player model the balance gate is graded on.
 *
 * Evaluates every single-tile rotation on the board, takes the best gain per
 * tap, and — when nothing improves the board — accepts that it is in a local
 * optimum and burns a tap on a random tile to break out. No lookahead, no plan,
 * no undo history: exactly the "turn things until it looks better" loop a player
 * runs under a payday clock.
 *
 * Always returns `{ taps, solved, level }` so the caller can score the board the
 * bot actually left behind — a level that runs out of clock still flows through
 * whatever pipe is standing.
 */
export function greedySolve(level, rand, maxRotations, cfg) {
  const work = cloneLevel(level);
  const scratch = createFlowScratch(work.cols, work.rows, work.tanks.length);
  const weights = cfg.bot.weights;
  const relaxed = buildRelaxedDistances(work);
  const rotatable = [];
  for (let i = 0; i < work.cells.length; i++) {
    if (!isLocked(work.cells[i])) rotatable.push(i);
  }
  const escape = [];
  // Short tabu on the tile an escape tap just touched. Without it the bot
  // deadlocks: the escape tap breaks a live join, the very next greedy tap puts
  // it straight back because that is the biggest available gain, and the pair
  // repeats until the clock runs out (measured: 11% of level-3 boards spun
  // forever). Refusing to re-touch what you just turned is both the fix and
  // what a player actually does.
  const tabu = new Int8Array(work.cells.length);

  let used = 0;
  let stuck = 0;
  while (rotatable.length > 0) {
    if (isLevelSolved(work, scratch)) break;
    if (used >= maxRotations) break;

    const base = boardScore(work, scratch, weights, relaxed);
    let bestGain = 0;
    let bestIdx = -1;
    let bestTurns = 0;
    for (let k = 0; k < rotatable.length; k++) {
      const i = rotatable[k];
      if (tabu[i] > 0) continue;
      const cell = work.cells[i];
      const states = TILE_STATES[cell.type];
      const r0 = cell.rot;
      for (let t = 1; t < states; t++) {
        if (used + t > maxRotations) break;
        cell.rot = (r0 + t) & 3;
        const gain = (boardScore(work, scratch, weights, relaxed) - base) / t;
        if (gain > bestGain) {
          bestGain = gain;
          bestIdx = i;
          bestTurns = t;
        }
      }
      cell.rot = r0;
    }

    if (bestIdx < 0) {
      // Local optimum. A player does not restart the board, they fiddle with
      // the tiles around where the water stopped — so the escape tap is drawn
      // from the live network and its immediate neighbours, and only falls back
      // to the whole board when nothing is live at all.
      computeFlow(work, scratch);
      escape.length = 0;
      for (let k = 0; k < rotatable.length; k++) {
        const i = rotatable[k];
        if (scratch.reached[i]) {
          escape.push(i);
          continue;
        }
        const c = i % work.cols;
        const r = (i - c) / work.cols;
        for (let d = 0; d < 4; d++) {
          const nc = c + DC[d];
          const nr = r + DR[d];
          if (nc < 0 || nc >= work.cols || nr < 0 || nr >= work.rows) continue;
          if (scratch.reached[nr * work.cols + nc]) {
            escape.push(i);
            break;
          }
        }
      }
      const pool = escape.length > 0 ? escape : rotatable;
      const pick = pool[Math.min(pool.length - 1, (rand() * pool.length) | 0)];
      work.cells[pick].rot = (work.cells[pick].rot + 1) & 3;
      tabu[pick] = cfg.bot.tabuSteps;
      used += 1;
      stuck += 1;
      if (stuck > cfg.bot.stuckLimit) break;
    } else {
      work.cells[bestIdx].rot = (work.cells[bestIdx].rot + bestTurns) & 3;
      used += bestTurns;
      stuck = 0;
    }
    for (let i = 0; i < tabu.length; i++) if (tabu[i] > 0) tabu[i] -= 1;
  }
  return { taps: used, solved: isLevelSolved(work, scratch), level: work };
}

/** Control bot: taps a uniformly random rotatable tile until the budget is gone. */
export function randomSolve(level, rand, maxRotations) {
  const work = cloneLevel(level);
  const scratch = createFlowScratch(work.cols, work.rows, work.tanks.length);
  const rotatable = [];
  for (let i = 0; i < work.cells.length; i++) {
    if (!isLocked(work.cells[i])) rotatable.push(i);
  }

  let used = 0;
  while (rotatable.length > 0 && used < maxRotations) {
    if (isLevelSolved(work, scratch)) break;
    const pick = rotatable[Math.min(rotatable.length - 1, (rand() * rotatable.length) | 0)];
    work.cells[pick].rot = (work.cells[pick].rot + 1) & 3;
    used += 1;
  }
  return { taps: used, solved: isLevelSolved(work, scratch), level: work };
}
