// slide.js — the rules of Slide to Safety, as pure functions.
//
// One swipe = one call to resolveSlide(), which walks the token forward until
// something stops it and returns a full description of what happened: the cells
// it crossed, the coins it picked up, the thin ice it deepened or broke, and
// where it ended. Nothing here touches the DOM, React or the kit, so
// scripts/balance.mjs runs exactly this code under node — the solver and the
// game can never disagree about what a swipe does.
//
// The split is deliberate: resolveSlide() is a *query* (it reads the level state
// but never mutates it) and applySlide() is the *commit*. The canvas needs the
// path up front to animate the glide, and the state must not change until the
// token has actually arrived.

import { TILE_GOAL, TILE_ROCK } from './levels.js';

export const DIRECTIONS = ['up', 'down', 'left', 'right'];

export const DIR_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Crack states. A tile is only ever `BROKEN` for the length of a fall. */
export const CRACK_INTACT = 0;
export const CRACK_DEEP = 1;
export const CRACK_BROKEN = 2;

/** Small deterministic PRNG so a headless run can be reproduced from a seed. */
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

/** Mutable per-level state. Coins survive a retry; thin ice is re-frozen. */
export function createLevelState(level) {
  return {
    c: level.start.c,
    r: level.start.r,
    cracks: new Uint8Array(level.cracks.length),
    coins: new Uint8Array(level.coins.length),
    /** Moves spent on this level, accumulated ACROSS retries (see levelAward). */
    moves: 0,
    falls: 0,
  };
}

/**
 * Put the token back on the start tile after a fall.
 *
 * Thin ice re-freezes (otherwise a retry would hand the player a board with a
 * permanent hole in it, which the solvability gate could not reason about), but
 * coins already banked stay banked — restarting a level must never be a way to
 * farm the same coin twice.
 */
export function restartLevel(level, state) {
  state.c = level.start.c;
  state.r = level.start.r;
  state.cracks.fill(CRACK_INTACT);
  state.falls += 1;
  return state;
}

const inBounds = (level, c, r) => c >= 0 && r >= 0 && c < level.cols && r < level.rows;
const tileAt = (level, c, r) => level.tiles[r * level.cols + c];

/**
 * Walk one swipe. Pure: `state` is read, never written.
 *
 * @returns {{
 *   dir: string,
 *   path: {c:number,r:number}[],   // start cell first, resting cell last
 *   cells: number,                 // cells travelled (0 = swiped into a wall)
 *   moved: boolean,
 *   stop: {c:number,r:number},
 *   reachedGoal: boolean,
 *   fell: boolean,
 *   brokeCrack: number,            // crack index, or -1
 *   deepened: number[],            // crack indices that went intact -> deep
 *   coins: number[],               // coin indices newly collected
 *   gusts: number[],               // path indices the token was shoved INTO
 * }}
 */
export function resolveSlide(level, state, dir) {
  const v = DIR_VECTORS[dir];
  if (!v) throw new Error(`unknown direction "${dir}"`);

  const path = [{ c: state.c, r: state.r }];
  const gusts = [];
  let c = state.c;
  let r = state.r;
  let reachedGoal = false;

  // The token advances at least one cell per iteration, so the grid area is a
  // hard bound on the loop; the guard is belt-and-braces for a malformed board.
  const guard = level.cols * level.rows + 4;
  for (let step = 0; step < guard; step++) {
    const nc = c + v.dx;
    const nr = r + v.dy;
    if (!inBounds(level, nc, nr)) break;
    if (tileAt(level, nc, nr) === TILE_ROCK) break;

    c = nc;
    r = nr;
    path.push({ c, r });
    if (tileAt(level, c, r) === TILE_GOAL) {
      reachedGoal = true;
      break;
    }

    // Gust. Only bites when the shove is perpendicular to the direction of
    // travel, and never chains: the cell the token is shoved into is not
    // re-tested, so one lane deflects one slide once.
    const wi = level.windAt[r * level.cols + c];
    if (wi >= 0) {
      const w = level.winds[wi];
      const perpendicular = w.dx !== 0 ? v.dx === 0 : v.dy === 0;
      if (perpendicular) {
        const pc = c + w.dx;
        const pr = r + w.dy;
        if (inBounds(level, pc, pr) && tileAt(level, pc, pr) !== TILE_ROCK) {
          c = pc;
          r = pr;
          gusts.push(path.length);
          path.push({ c, r });
          if (tileAt(level, c, r) === TILE_GOAL) {
            reachedGoal = true;
            break;
          }
        }
      }
    }
  }

  // Thin ice, resolved along the finished path. A break truncates everything
  // after it — the token is in the water, it does not carry on.
  let brokeCrack = -1;
  let stopIndex = path.length - 1;
  const deepened = [];
  for (let i = 1; i < path.length; i++) {
    const cell = path[i];
    const ci = level.crackAt[cell.r * level.cols + cell.c];
    if (ci < 0) continue;
    const isResting = i === path.length - 1;
    if (isResting || state.cracks[ci] !== CRACK_INTACT) {
      brokeCrack = ci;
      stopIndex = i;
      break;
    }
    deepened.push(ci);
  }

  const finalPath = brokeCrack >= 0 ? path.slice(0, stopIndex + 1) : path;
  if (brokeCrack >= 0) reachedGoal = false;

  // Coins are banked for every cell actually crossed, including on the swipe
  // that drowns the token: they were picked up before the ice gave way.
  const coins = [];
  for (let i = 1; i < finalPath.length; i++) {
    const cell = finalPath[i];
    const gi = level.coinAt[cell.r * level.cols + cell.c];
    if (gi >= 0 && !state.coins[gi] && coins.indexOf(gi) < 0) coins.push(gi);
  }

  const stop = finalPath[finalPath.length - 1];
  return {
    dir,
    path: finalPath,
    cells: finalPath.length - 1,
    moved: finalPath.length > 1,
    stop,
    reachedGoal,
    fell: brokeCrack >= 0,
    brokeCrack,
    deepened,
    coins,
    gusts: gusts.filter((i) => i < finalPath.length),
  };
}

/** Commit a resolved slide. A swipe into a wall changes nothing and costs no move. */
export function applySlide(level, state, res) {
  if (!res.moved) return state;
  state.c = res.stop.c;
  state.r = res.stop.r;
  for (let i = 0; i < res.coins.length; i++) state.coins[res.coins[i]] = 1;
  for (let i = 0; i < res.deepened.length; i++) state.cracks[res.deepened[i]] = CRACK_DEEP;
  if (res.brokeCrack >= 0) state.cracks[res.brokeCrack] = CRACK_BROKEN;
  state.moves += 1;
  return state;
}

/**
 * What finishing a level is worth.
 *
 * `movesUsed` is the level's cumulative move count across every retry, so a
 * player cannot deliberately drown to reset a botched route and still claim the
 * par bonus — that trade already costs a retry, and it costs the bonus too.
 */
export function levelAward(scoring, par, movesUsed) {
  let bonus = 0;
  if (movesUsed <= par) bonus = scoring.parBonus;
  else if (movesUsed === par + 1) bonus = scoring.nearParBonus;
  return { base: scoring.levelComplete, bonus, total: scoring.levelComplete + bonus };
}

/** Seconds the glide animation takes — also the clock cost of the move. */
export function slideSeconds(timing, cells) {
  return Math.max(timing.slideMinSeconds, cells / timing.slideCellsPerSecond);
}
