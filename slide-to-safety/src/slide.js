// slide.js — the rules of Slide to Safety, as pure functions.
//
// One committed swipe = one call to resolveSlide(), which walks the token
// forward until something stops it and returns a full description of what
// happened: the cells it crossed, the coins it picked up, the thin ice it
// deepened or broke, the cover point it reached, and where it ended. Nothing
// here touches the DOM, React or the kit, so scripts/balance.mjs runs exactly
// this code under node — the solver, the swept-collision gate and the game can
// never disagree about what a swipe does.
//
// Three roles, deliberately separated:
//
//   resolveSlide()  a QUERY. Reads the level state, never mutates it. The
//                   canvas calls it on every pointer move to draw the route
//                   preview, so it must be free of side effects.
//   createGlide()/  the MOTION. Samples the resolved path over time with the
//   advanceGlide()  shipped speed profile. Both the renderer and the
//                   anti-tunnelling gate drive these, so "what the player sees"
//                   and "what the gate proves" are the same function.
//   applySlide()    the COMMIT. The only thing that changes the board.

import { TILE_COVER, TILE_GOAL, TILE_ROCK } from './levels.js';

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

/**
 * Mutable per-level state.
 *
 * `anchorC/anchorR` is the respawn cell — the start tile until a cover point is
 * reached, and that cover point afterwards. It is the mechanical core of the
 * safe zone: cover means a fall costs you a retry, not the whole board.
 */
export function createLevelState(level) {
  return {
    c: level.start.c,
    r: level.start.r,
    anchorC: level.start.c,
    anchorR: level.start.r,
    cracks: new Uint8Array(level.cracks.length),
    coins: new Uint8Array(level.coins.length),
    covers: new Uint8Array(level.covers.length),
    /** Moves spent on this level, accumulated ACROSS retries (see levelAward). */
    moves: 0,
    falls: 0,
  };
}

/**
 * Put the token back after a fall — on the last cover point reached, or on the
 * start tile if the player never banked one.
 *
 * Thin ice re-freezes (otherwise a retry would hand the player a board with a
 * permanent hole in it, which the solvability gate could not reason about), but
 * coins and cover points already banked stay banked — restarting a level must
 * never be a way to farm the same pickup twice.
 */
export function restartLevel(level, state) {
  state.c = state.anchorC;
  state.r = state.anchorR;
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
 *   stopKind: 'rock'|'shore'|'goal'|'cover'|'water',
 *   reachedGoal: boolean,
 *   fell: boolean,
 *   brokeCrack: number,            // crack index, or -1
 *   deepened: number[],            // crack indices that went intact -> deep
 *   coins: number[],               // coin indices newly collected
 *   cover: number,                 // cover index rested on, or -1
 *   coverNew: boolean,             // first time this cover point is claimed
 *   refreeze: boolean,             // this slide re-freezes every crack
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
  // Why the glide ended, for the preview marker and the impact effect.
  let stopKind = 'shore';

  // The token advances at least one cell per iteration, so the grid area is a
  // hard bound on the loop; the guard is belt-and-braces for a malformed board.
  const guard = level.cols * level.rows + 4;
  for (let step = 0; step < guard; step++) {
    const nc = c + v.dx;
    const nr = r + v.dy;
    if (!inBounds(level, nc, nr)) {
      stopKind = 'shore';
      break;
    }
    if (tileAt(level, nc, nr) === TILE_ROCK) {
      stopKind = 'rock';
      break;
    }

    c = nc;
    r = nr;
    path.push({ c, r });
    const t = tileAt(level, c, r);
    if (t === TILE_GOAL) {
      reachedGoal = true;
      stopKind = 'goal';
      break;
    }
    // A cover point is STICKY: the safe zone catches the shield. That is what
    // makes it a routing tool rather than a decorated tile — it creates a stop
    // where the open ice had none.
    if (t === TILE_COVER) {
      stopKind = 'cover';
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
          const pt = tileAt(level, c, r);
          if (pt === TILE_GOAL) {
            reachedGoal = true;
            stopKind = 'goal';
            break;
          }
          if (pt === TILE_COVER) {
            stopKind = 'cover';
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
  if (brokeCrack >= 0) {
    reachedGoal = false;
    stopKind = 'water';
  }

  // Coins are banked for every cell actually crossed, including on the swipe
  // that drowns the token: they were picked up before the ice gave way.
  const coins = [];
  for (let i = 1; i < finalPath.length; i++) {
    const cell = finalPath[i];
    const gi = level.coinAt[cell.r * level.cols + cell.c];
    if (gi >= 0 && !state.coins[gi] && coins.indexOf(gi) < 0) coins.push(gi);
  }

  const stop = finalPath[finalPath.length - 1];
  const cover = stopKind === 'cover' ? level.coverAt[stop.r * level.cols + stop.c] : -1;

  return {
    dir,
    path: finalPath,
    cells: finalPath.length - 1,
    moved: finalPath.length > 1,
    stop,
    stopKind,
    reachedGoal,
    fell: brokeCrack >= 0,
    brokeCrack,
    deepened,
    coins,
    cover,
    coverNew: cover >= 0 && !state.covers[cover],
    // Reaching cover restores the ice you have already spent: every deepened
    // fracture re-freezes. This is the "opens a route" half of the safe zone —
    // a corridor you burned on the way out is crossable again on the way back.
    refreeze: cover >= 0,
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
  if (res.cover >= 0) {
    state.covers[res.cover] = 1;
    state.anchorC = res.stop.c;
    state.anchorR = res.stop.r;
  }
  // Last, so it wins over anything this slide deepened on the way in.
  if (res.refreeze) state.cracks.fill(CRACK_INTACT);
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

/* ─── Motion ──────────────────────────────────────────────────
   The shield does not travel at a constant speed: it takes `launch` of the move
   to come up to speed and then holds it into the impact, which is what makes a
   shove on ice read as a shove rather than a lerp. Nothing decelerates — every
   slide in this game ends by hitting something, and the recoil at the far end is
   the renderer's job.

   Consequence that matters: the mid-glide speed is HIGHER than the average, by
   1/(1 - launch/2). That is exactly the regime where a naive per-frame collision
   test tunnels, which is why the sampler below is a shipped function and
   scripts/balance.mjs drives it rather than re-implementing it. */

/**
 * Normalised distance travelled at normalised time `u`.
 * Monotonic, ease(0) = 0, ease(1) = 1, C0 at the join.
 */
export function glideEase(u, launch) {
  if (!(u > 0)) return 0;
  if (u >= 1) return 1;
  const a = launch > 0 ? Math.min(0.6, launch) : 0;
  if (a <= 0) return u;
  const norm = 1 - a / 2;
  return (u < a ? (u * u) / (2 * a) : u - a / 2) / norm;
}

/** Peak speed multiplier over the average, for the tunnelling budget. */
export function glidePeakFactor(launch) {
  const a = launch > 0 ? Math.min(0.6, launch) : 0;
  return 1 / (1 - a / 2);
}

/** Start sampling a resolved slide. `c`/`r` are fractional cell coordinates. */
export function createGlide(timing, res) {
  return {
    res,
    t: 0,
    dur: slideSeconds(timing, res.cells),
    span: res.path.length - 1,
    /** Index of the last path cell the token has ENTERED. */
    idx: 0,
    u: 0,
    c: res.path[0].c,
    r: res.path[0].r,
    done: false,
  };
}

/**
 * Advance a glide by `dt` and return how many NEW path cells were entered — they
 * are `g.res.path[g.idx - n + 1 … g.idx]`, so the caller fires their events in
 * order however large `dt` was.
 *
 * Anti-tunnelling, by construction rather than by tolerance: the position is
 * interpolated ALONG the resolved polyline (`path[i] → path[i+1]`, always
 * adjacent cells) and the cell index is `floor` of the same eased parameter. The
 * two can therefore never disagree, no cell can be stepped over, and no corner
 * can be cut into a rock — at any frame rate, at any slide speed. scripts/
 * balance.mjs asserts all three by sampling this function.
 */
export function advanceGlide(g, dt, launch) {
  g.t = Math.min(g.dur, g.t + (dt > 0 ? dt : 0));
  const u = glideEase(g.dur > 0 ? g.t / g.dur : 1, launch);
  g.u = u;
  const p = u * g.span;
  let i = Math.floor(p);
  if (i > g.span) i = g.span;
  const f = i >= g.span ? 0 : p - i;
  const from = g.res.path[i];
  const to = g.res.path[i < g.span ? i + 1 : g.span];
  g.c = from.c + (to.c - from.c) * f;
  g.r = from.r + (to.r - from.r) * f;
  const entered = i - g.idx;
  g.idx = i;
  g.done = g.t >= g.dur;
  return entered;
}
