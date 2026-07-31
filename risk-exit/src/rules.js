// rules.js — pure sliding-block (Rush Hour) logic for Risk Exit.
//
// Imported by BOTH RiskExitGame.jsx and gate.mjs, so the solver proves the
// rules the player actually plays. No React, no DOM, no side effects.
//
// A piece is { id, kind, r, c, len, dir } with dir 'h' (slides left/right) or
// 'v' (slides up/down). r,c is the top-left cell. The hero piece (kind
// 'hero') is a 2-cell horizontal block parked in HERO_ROW; the exit gate is
// the right edge of that row, so the level is solved the moment the hero sits
// flush against it.

export const GRID = 6;
export const HERO_ROW = 2;

export const heroIndex = (pieces) => pieces.findIndex((p) => p.kind === 'hero');

/** 36-cell occupancy bitmap, optionally ignoring one piece index. */
export function occupancy(pieces, skipIdx = -1) {
  const g = new Uint8Array(GRID * GRID);
  for (let i = 0; i < pieces.length; i++) {
    if (i === skipIdx) continue;
    const p = pieces[i];
    for (let k = 0; k < p.len; k++) {
      const r = p.dir === 'v' ? p.r + k : p.r;
      const c = p.dir === 'h' ? p.c + k : p.c;
      g[r * GRID + c] = 1;
    }
  }
  return g;
}

/**
 * How far piece `idx` may slide along its axis before hitting a piece or a
 * wall: `back` cells toward left/up, `fwd` cells toward right/down.
 * This is the ONLY definition of a legal move — the drag handler clamps to it
 * and the solver enumerates from it.
 */
export function slideRange(pieces, idx) {
  const p = pieces[idx];
  const g = occupancy(pieces, idx);
  let back = 0;
  let fwd = 0;
  if (p.dir === 'h') {
    while (p.c - back - 1 >= 0 && !g[p.r * GRID + (p.c - back - 1)]) back += 1;
    while (p.c + p.len + fwd < GRID && !g[p.r * GRID + (p.c + p.len + fwd)]) fwd += 1;
  } else {
    while (p.r - back - 1 >= 0 && !g[(p.r - back - 1) * GRID + p.c]) back += 1;
    while (p.r + p.len + fwd < GRID && !g[(p.r + p.len + fwd) * GRID + p.c]) fwd += 1;
  }
  return { back, fwd };
}

/** New piece array with piece `idx` shifted `delta` cells along its axis. */
export function applyMove(pieces, idx, delta) {
  const next = pieces.map((p) => ({ ...p }));
  if (next[idx].dir === 'h') next[idx].c += delta;
  else next[idx].r += delta;
  return next;
}

/** Solved = the hero is flush against the exit gate on the right wall. */
export function isSolved(pieces) {
  const h = pieces[heroIndex(pieces)];
  return h.c + h.len === GRID;
}

/** Compact search key: only the free coordinate of each piece can change. */
export const encode = (pieces) => pieces.map((p) => (p.dir === 'h' ? p.c : p.r)).join(',');

/** Does this piece currently sit in the hero's row, i.e. still block the exit? */
export function blocksHeroRow(p) {
  if (p.kind === 'hero') return false;
  if (p.dir === 'h') return p.r === HERO_ROW;
  return p.r <= HERO_ROW && p.r + p.len - 1 >= HERO_ROW;
}

/** Structural problems with an authored level. Empty array = well-formed. */
export function validateLevel(pieces) {
  const errs = [];
  const heroes = pieces.filter((p) => p.kind === 'hero');
  if (heroes.length !== 1) errs.push(`expected exactly 1 hero, found ${heroes.length}`);
  const h = heroes[0];
  if (h && (h.dir !== 'h' || h.len !== 2 || h.r !== HERO_ROW)) {
    errs.push(`hero must be a 2-cell horizontal block in row ${HERO_ROW}`);
  }
  const seen = new Set();
  const ids = new Set();
  for (const p of pieces) {
    if (ids.has(p.id)) errs.push(`duplicate piece id "${p.id}"`);
    ids.add(p.id);
    if (p.dir !== 'h' && p.dir !== 'v') errs.push(`${p.id}: dir must be 'h' or 'v'`);
    if (p.len !== 2 && p.len !== 3) errs.push(`${p.id}: len must be 2 or 3`);
    const endR = p.dir === 'v' ? p.r + p.len - 1 : p.r;
    const endC = p.dir === 'h' ? p.c + p.len - 1 : p.c;
    if (p.r < 0 || p.c < 0 || endR >= GRID || endC >= GRID) errs.push(`${p.id}: off the ${GRID}x${GRID} board`);
    for (let k = 0; k < p.len; k++) {
      const r = p.dir === 'v' ? p.r + k : p.r;
      const c = p.dir === 'h' ? p.c + k : p.c;
      const key = r * GRID + c;
      if (seen.has(key)) errs.push(`${p.id}: overlaps another piece at (${r},${c})`);
      seen.add(key);
    }
  }
  return errs;
}

/**
 * Breadth-first search for the shortest solution. A move is one piece sliding
 * any number of cells in one direction — exactly what one drag does — so the
 * returned depth is the level's par.
 * Returns { moves, path: [[pieceId, delta], ...], states } or null.
 */
export function solve(pieces, maxStates = 500000) {
  if (isSolved(pieces)) return { moves: 0, path: [], states: 1 };
  const startKey = encode(pieces);
  const prev = new Map([[startKey, null]]);
  let frontier = [pieces];
  let depth = 0;

  while (frontier.length && prev.size <= maxStates) {
    depth += 1;
    const next = [];
    for (const cur of frontier) {
      const curKey = encode(cur);
      for (let i = 0; i < cur.length; i++) {
        const { back, fwd } = slideRange(cur, i);
        for (let d = -back; d <= fwd; d++) {
          if (d === 0) continue;
          const nxt = applyMove(cur, i, d);
          const key = encode(nxt);
          if (prev.has(key)) continue;
          prev.set(key, { from: curKey, move: [cur[i].id, d] });
          if (isSolved(nxt)) {
            const path = [];
            for (let k = key; prev.get(k); k = prev.get(k).from) path.unshift(prev.get(k).move);
            return { moves: depth, path, states: prev.size };
          }
          next.push(nxt);
        }
      }
    }
    frontier = next;
  }
  return null;
}
