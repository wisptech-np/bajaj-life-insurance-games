// levels.js — level construction for Income Pipeline, as pure data.
//
// Like flow.js this module is free of React, DOM and canvas so that
// scripts/balance.mjs can generate and grade the SHIPPED boards under Node.
//
// A level is built solved and then broken, never the other way round:
//
//   1. carve a tree through the grid from the salary inlet to every tank mouth,
//   2. read each tile's required port mask straight off that tree — degree 2 in
//      line is a straight, degree 2 around a corner is an elbow, degree 3 a tee,
//      degree 4 a cross,
//   3. fill every unused cell with a decoy tile,
//   4. spin the tree tiles by random amounts until the board sits in the
//      scramble band the level asks for.
//
// Solvability is therefore guaranteed by construction — there is always at
// least one winning configuration, because the board was one a moment ago. The
// gate on top of that is flow.js minRotationsToSolve(), which reports the
// distance to the NEAREST winning configuration; a candidate is rejected unless
// that number lands inside the level's [parMin, parMax] band, so a board can
// neither arrive already solved nor arrive further from a solution than the
// payday clock can pay for.

import {
  DC, DR, OPP, E, W,
  TILE_BASE, TILE_STATES,
  rotateMask, tapsTo,
  minRotationsToSolve, scrambleDistance,
  isLevelSolved, createFlowScratch,
} from './flow.js';

const popcount4 = (m) => ((m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1));

/** Tile type whose rotations can produce this port mask. */
function typeForMask(mask) {
  const bits = popcount4(mask);
  if (bits === 4) return 'cross';
  if (bits === 3) return 'tee';
  if (bits === 2) return mask === 0b0101 || mask === 0b1010 ? 'straight' : 'elbow';
  return null;
}

/** The rotation at which `type` shows exactly `mask`. */
function rotForMask(type, mask) {
  const base = TILE_BASE[type];
  for (let r = 0; r < 4; r++) if (rotateMask(base, r) === mask) return r;
  return -1;
}

function pickWeighted(weights, rand) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let roll = rand() * total;
  for (const k in weights) {
    roll -= weights[k];
    if (roll <= 0) return k;
  }
  return Object.keys(weights)[0];
}

/**
 * Randomised depth-first carve.
 *
 * Cells are marked visited permanently on the way down, so the walk is a DFS
 * over the free component and finds the goal whenever one is reachable at all —
 * it can wander, but it cannot fail on a grid that has an answer. `bias` is the
 * chance that the step toward the target is tried first, which is the single
 * knob between ruler-straight pipe runs and spaghetti.
 */
function dfsPath(cols, rows, start, goalTest, blocked, rand, bias, targetCol, targetRow, maxLen) {
  const n = cols * rows;
  const visited = new Uint8Array(n);

  const makeFrame = (i) => {
    const c = i % cols;
    const r = (i - c) / cols;
    const dirs = [0, 1, 2, 3];
    for (let k = 3; k > 0; k--) {
      const j = (rand() * (k + 1)) | 0;
      const t = dirs[k];
      dirs[k] = dirs[j];
      dirs[j] = t;
    }
    if (rand() < bias) {
      const dc = targetCol - c;
      const dr = targetRow - r;
      let want;
      if (Math.abs(dc) >= Math.abs(dr)) want = dc > 0 ? 1 : dc < 0 ? 3 : dr > 0 ? 2 : 0;
      else want = dr > 0 ? 2 : dr < 0 ? 0 : dc > 0 ? 1 : 3;
      const k2 = dirs.indexOf(want);
      if (k2 > 0) {
        dirs[k2] = dirs[0];
        dirs[0] = want;
      }
    }
    return { i, dirs, k: 0 };
  };

  visited[start] = 1;
  if (goalTest(start)) return [start];
  const frames = [makeFrame(start)];

  while (frames.length > 0) {
    const f = frames[frames.length - 1];
    if (f.k >= 4 || frames.length >= maxLen) {
      frames.pop();
      continue;
    }
    const d = f.dirs[f.k++];
    const c = f.i % cols;
    const r = (f.i - c) / cols;
    const nc = c + DC[d];
    const nr = r + DR[d];
    if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
    const j = nr * cols + nc;
    if (visited[j] || blocked[j]) continue;
    visited[j] = 1;
    frames.push(makeFrame(j));
    if (goalTest(j)) {
      const out = new Array(frames.length);
      for (let k = 0; k < frames.length; k++) out[k] = frames[k].i;
      return out;
    }
  }
  return null;
}

/** Direction from cell a to adjacent cell b. */
function dirBetween(cols, a, b) {
  const ac = a % cols;
  const ar = (a - ac) / cols;
  const bc = b % cols;
  const br = (b - bc) / cols;
  for (let d = 0; d < 4; d++) if (ac + DC[d] === bc && ar + DR[d] === br) return d;
  return -1;
}

/**
 * Carve the solution tree. Returns the per-cell required port mask, or null if
 * this particular set of rows painted itself into a corner.
 */
function carveTree(cols, rows, sourceRow, tankRows, rand, bias) {
  const n = cols * rows;
  const need = new Uint8Array(n);
  const inTree = new Uint8Array(n);
  const lastCol = cols - 1;

  const inlet = sourceRow * cols;
  need[inlet] |= 1 << W;

  // First tank: a plain carve from the inlet to its mouth.
  const firstMouth = tankRows[0] * cols + lastCol;
  const noBlock = new Uint8Array(n);
  const path = dfsPath(cols, rows, inlet, (j) => j === firstMouth, noBlock, rand, bias, lastCol, tankRows[0], n);
  if (!path || path.length < 2) return null;
  for (const i of path) inTree[i] = 1;
  for (let k = 0; k + 1 < path.length; k++) {
    const d = dirBetween(cols, path[k], path[k + 1]);
    if (d < 0) return null;
    need[path[k]] |= 1 << d;
    need[path[k + 1]] |= 1 << OPP[d];
  }
  need[firstMouth] |= 1 << E;

  // Later tanks: carve BACK from the mouth until the walk touches the existing
  // tree at a tile that still has a spare face.
  for (let t = 1; t < tankRows.length; t++) {
    const mouth = tankRows[t] * cols + lastCol;
    if (inTree[mouth]) {
      if (popcount4(need[mouth]) >= 4) return null;
      need[mouth] |= 1 << E;
      continue;
    }
    let attach = -1;
    const touches = (j) => {
      const c = j % cols;
      const r = (j - c) / cols;
      for (let d = 0; d < 4; d++) {
        const nc = c + DC[d];
        const nr = r + DR[d];
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const k = nr * cols + nc;
        if (inTree[k] && popcount4(need[k]) < 4) {
          attach = k;
          return true;
        }
      }
      return false;
    };
    const branch = dfsPath(cols, rows, mouth, touches, inTree, rand, bias, 0, sourceRow, n);
    if (!branch || attach < 0) return null;
    for (const i of branch) inTree[i] = 1;
    for (let k = 0; k + 1 < branch.length; k++) {
      const d = dirBetween(cols, branch[k], branch[k + 1]);
      if (d < 0) return null;
      need[branch[k]] |= 1 << d;
      need[branch[k + 1]] |= 1 << OPP[d];
    }
    const tail = branch[branch.length - 1];
    const d = dirBetween(cols, tail, attach);
    if (d < 0) return null;
    need[tail] |= 1 << d;
    need[attach] |= 1 << OPP[d];
    need[mouth] |= 1 << E;
  }

  // Every tile the tree touches must be expressible as a real tile: two ports
  // minimum (the inlet and each mouth get their outside face for free), four
  // maximum.
  let treeCells = 0;
  for (let i = 0; i < n; i++) {
    if (!inTree[i]) continue;
    treeCells += 1;
    const bits = popcount4(need[i]);
    if (bits < 2 || bits > 4) return null;
  }
  return { need, inTree, treeCells };
}

/**
 * Build one level. `spec` is an entry from GAME_CONFIG.levels; `tankTypes` the
 * identities to hand the tanks, longest-term goal last.
 */
export function generateLevel(cfg, spec, tankTypes, rand) {
  const { cols, rows } = spec;
  const n = cols * rows;
  const gen = cfg.generation;
  const minTreeCells = cols + rows - 2;

  for (let layoutTry = 0; layoutTry < gen.layoutAttempts; layoutTry++) {
    const sourceRow = (rand() * rows) | 0;

    // Distinct tank rows, drawn without replacement so two tanks never share a
    // mouth. Kept sorted so the tank column reads top-to-bottom in board order.
    const rowPool = [];
    for (let r = 0; r < rows; r++) rowPool.push(r);
    for (let k = rowPool.length - 1; k > 0; k--) {
      const j = (rand() * (k + 1)) | 0;
      const t = rowPool[k];
      rowPool[k] = rowPool[j];
      rowPool[j] = t;
    }
    const tankRows = rowPool.slice(0, spec.tanks).sort((a, b) => a - b);

    const tree = carveTree(cols, rows, sourceRow, tankRows, rand, gen.carryOnBias);
    if (!tree || tree.treeCells < minTreeCells) continue;

    // Tiles. Tree tiles are whatever their port mask demands; the rest are
    // decoys drawn from the weighted pool.
    const cells = new Array(n);
    const solvedRots = new Int8Array(n);
    let bad = false;
    for (let i = 0; i < n; i++) {
      if (tree.inTree[i]) {
        const type = typeForMask(tree.need[i]);
        const rot = type ? rotForMask(type, tree.need[i]) : -1;
        if (!type || rot < 0) {
          bad = true;
          break;
        }
        cells[i] = { type, rot };
        solvedRots[i] = rot;
      } else {
        const type = pickWeighted(gen.decoyWeights, rand);
        cells[i] = { type, rot: (rand() * 4) | 0 };
        solvedRots[i] = cells[i].rot;
      }
    }
    if (bad) continue;

    const tankRowOf = new Int8Array(rows).fill(-1);
    const tanks = tankRows.map((row, k) => {
      tankRowOf[row] = k;
      const id = tankTypes[k % tankTypes.length];
      return { row, key: id.key, label: id.label, full: id.full, color: id.color, colorLt: id.colorLt };
    });

    const level = {
      id: spec.id,
      cols,
      rows,
      timerSeconds: spec.timerSeconds,
      sourceRow,
      tanks,
      tankRowOf,
      cells,
      solvedRots,
      onPath: tree.inTree,
      par: 0,
      scrambleDist: 0,
    };

    const scratch = createFlowScratch(cols, rows, tanks.length);
    const [smin, smax] = spec.scramble;

    for (let attempt = 0; attempt < gen.scrambleAttempts; attempt++) {
      for (let i = 0; i < n; i++) {
        if (tree.inTree[i]) {
          const states = TILE_STATES[cells[i].type];
          cells[i].rot = states <= 1 ? solvedRots[i] : (solvedRots[i] + ((rand() * 4) | 0)) & 3;
        } else {
          cells[i].rot = (rand() * 4) | 0;
          // A decoy has no "correct" rotation — wherever it sits is part of a
          // winning layout, so it must not inflate the scramble distance.
          solvedRots[i] = cells[i].rot;
        }
      }

      const dist = scrambleDistance(level);
      if (dist < smin || dist > smax) continue;
      if (isLevelSolved(level, scratch)) continue;

      const par = minRotationsToSolve(level);
      if (par < spec.parMin || par > spec.parMax) continue;

      level.par = par;
      level.scrambleDist = dist;
      return level;
    }
  }
  throw new Error(`income-pipeline: could not generate level ${spec.id} within the attempt budget`);
}

/** The three boards of one session. */
export function generateLevelSet(cfg, rand) {
  return cfg.levels.map((spec) => generateLevel(cfg, spec, cfg.tankTypes, rand));
}

/** Restore a level to a winning layout — used by the sim's par certificate. */
export function applySolution(level) {
  for (let i = 0; i < level.cells.length; i++) {
    const taps = tapsTo(level.cells[i], level.solvedRots[i]);
    level.cells[i].rot = (level.cells[i].rot + taps) & 3;
  }
  return level;
}
