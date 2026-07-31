// gate.mjs — Risk Exit headless solvability gate.  Run:  node gate.mjs
//
// Imports the SHIPPED src/data.js + src/rules.js (never a re-implementation),
// so the boards it proves are the boards that ship and the moves it enumerates
// are the moves the drag handler allows. Prints PASS/FAIL per check and exits
// non-zero if anything fails.
//
//   (a) every shipped level is structurally well-formed (in bounds, no
//       overlaps, exactly one 2-cell hero in the gate row);
//   (b) every shipped level is SOLVABLE — breadth-first search finds the
//       minimum number of drags, and that number must equal the authored
//       `par`. An unsolvable level is a hard failure;
//   (c) the returned solution replays legally: every move in the path is
//       inside `slideRange` at the moment it is played, and the replay ends
//       with the hero flush against the exit gate;
//   (d) no level is a freebie (>= 4 drags) and difficulty never goes down;
//   (e) the checker itself has teeth — a deliberately walled-in board must
//       come back unsolvable, and a pre-solved board must come back at 0;
//   (f) the drag pipeline cannot corrupt a board — 40k randomised drags using
//       the exact clamp-and-snap arithmetic RiskExitGame.jsx applies (including
//       over-shoots well past the legal range) never produce an overlap or an
//       off-board piece.

import { LEVELS, GAME_CONFIG, TARGET_SCORE } from './src/data.js';
import {
  GRID, HERO_ROW, applyMove, blocksHeroRow, heroIndex, isSolved, slideRange,
  solve, validateLevel,
} from './src/rules.js';

let failures = 0;
function report(ok, label, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/** ASCII dump of a board: X = hero, letters = risk blocks, > = the exit gate. */
function render(pieces) {
  const g = Array.from({ length: GRID }, () => Array(GRID).fill('.'));
  pieces.forEach((p, i) => {
    const ch = p.kind === 'hero' ? 'X' : String.fromCharCode(64 + i);
    for (let k = 0; k < p.len; k++) {
      g[p.dir === 'v' ? p.r + k : p.r][p.dir === 'h' ? p.c + k : p.c] = ch;
    }
  });
  return g.map((row, r) => `    ${row.join(' ')} ${r === HERO_ROW ? '>' : '|'}`).join('\n');
}

console.log(`Risk Exit gate — shipped src/data.js + src/rules.js\n`);
console.log(`${GRID}x${GRID} board, exit gate on the right wall of row ${HERO_ROW}, ` +
  `${LEVELS.length} levels, ${GAME_CONFIG.sessionSeconds}s session, target score ${TARGET_SCORE}\n`);

/* ─── (a)–(d) per level ───────────────────────────────────────────────────── */

let totalPar = 0;
let prevPar = 0;
let ladderOk = true;

for (const level of LEVELS) {
  const pieces = level.pieces.map((p) => ({ ...p }));
  const errs = validateLevel(pieces);
  report(errs.length === 0, `(a) level ${level.id} "${level.name}" well-formed`,
    errs.length ? errs.join('; ') : `${pieces.length} pieces, ` +
    `${pieces.filter(blocksHeroRow).length} blocking the exit lane, ` +
    `${new Set(pieces.filter((p) => p.kind !== 'hero').map((p) => p.kind)).size} risk types`);
  if (errs.length) continue;

  console.log(render(pieces));

  const t0 = Date.now();
  const sol = solve(pieces);
  const ms = Date.now() - t0;

  if (!sol) {
    report(false, `(b) level ${level.id} SOLVABLE`, 'BFS exhausted the state space with no solution');
    continue;
  }
  report(true, `(b) level ${level.id} solvable`,
    `min ${sol.moves} drags, ${sol.states} states explored in ${ms}ms`);
  report(sol.moves === level.par, `(b) level ${level.id} par matches the solver`,
    `authored par=${level.par}, solver minimum=${sol.moves}`);

  // (c) replay the solution through the same legality check the drag uses.
  let cur = pieces;
  let legal = true;
  for (const [id, delta] of sol.path) {
    const idx = cur.findIndex((p) => p.id === id);
    const { back, fwd } = slideRange(cur, idx);
    if (idx < 0 || delta === 0 || delta > fwd || delta < -back) { legal = false; break; }
    cur = applyMove(cur, idx, delta);
  }
  report(legal && isSolved(cur), `(c) level ${level.id} solution replays legally`,
    sol.path.map(([id, d]) => `${id}${d > 0 ? '+' : ''}${d}`).join(' '));

  report(sol.moves >= 4, `(d) level ${level.id} is not a freebie`, `${sol.moves} drags minimum`);
  if (sol.moves < prevPar) ladderOk = false;
  prevPar = sol.moves;
  totalPar += sol.moves;
  console.log('');
}

report(ladderOk, '(d) difficulty ladder never goes backwards',
  LEVELS.map((l) => l.par).join(' -> '));

const budget = GAME_CONFIG.sessionSeconds / totalPar;
report(budget >= 1.4, '(d) the session clock affords the full ladder',
  `${totalPar} drags total in ${GAME_CONFIG.sessionSeconds}s = ${budget.toFixed(2)}s per drag at par`);

/* ─── (e) the checker has teeth ───────────────────────────────────────────── */

{
  // Hero walled in by two vertical 3-blocks that cannot move: column 2 is
  // fully packed top to bottom, so nothing can ever leave the exit lane.
  const walled = [
    { id: 'cover', kind: 'hero', r: HERO_ROW, c: 0, len: 2, dir: 'h' },
    { id: 'w1', kind: 'debt', r: 0, c: 2, len: 3, dir: 'v' },
    { id: 'w2', kind: 'debt', r: 3, c: 2, len: 3, dir: 'v' },
    { id: 'w3', kind: 'market', r: 0, c: 3, len: 3, dir: 'v' },
    { id: 'w4', kind: 'market', r: 3, c: 3, len: 3, dir: 'v' },
    { id: 'w5', kind: 'illness', r: 0, c: 4, len: 3, dir: 'v' },
    { id: 'w6', kind: 'illness', r: 3, c: 4, len: 3, dir: 'v' },
    { id: 'w7', kind: 'job', r: 0, c: 5, len: 3, dir: 'v' },
    { id: 'w8', kind: 'job', r: 3, c: 5, len: 3, dir: 'v' },
  ];
  report(validateLevel(walled).length === 0 && solve(walled) === null,
    '(e) a walled-in board is reported UNSOLVABLE (the check can actually fail)');

  const done = [{ id: 'cover', kind: 'hero', r: HERO_ROW, c: GRID - 2, len: 2, dir: 'h' }];
  const z = solve(done);
  report(z && z.moves === 0 && heroIndex(done) === 0, '(e) a hero already at the gate solves in 0 drags');
}

/* ─── (f) the drag pipeline cannot corrupt a board ────────────────────────── */

{
  // Replays the exact arithmetic in RiskExitGame.jsx's pointer handlers:
  //   clamped = max(-back, min(fwd, rawCellsDragged));  snap = round(clamped)
  // fed deliberately wild raw offsets so the clamp is the only thing standing
  // between a fat-fingered swipe and a broken board.
  let seed = 20260731;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const DRAGS = 40000;
  let corrupted = 0;
  let accidentalWins = 0;
  let committed = 0;

  for (const level of LEVELS) {
    let cur = level.pieces.map((p) => ({ ...p }));
    for (let i = 0; i < DRAGS / LEVELS.length; i++) {
      const idx = Math.floor(rand() * cur.length);
      const { back, fwd } = slideRange(cur, idx);
      const raw = (rand() * 2 - 1) * 9;                       // wildly over-range
      const snap = Math.round(Math.max(-back, Math.min(fwd, raw)));
      if (snap === 0) continue;
      committed += 1;
      cur = applyMove(cur, idx, snap);
      if (validateLevel(cur).length) { corrupted += 1; break; }
      if (isSolved(cur)) {
        accidentalWins += 1;
        cur = level.pieces.map((p) => ({ ...p }));           // reset and keep going
      }
    }
  }
  report(corrupted === 0 && committed > 10000,
    '(f) randomised drags never corrupt a board',
    `${committed} committed drags across ${LEVELS.length} levels, ` +
    `${corrupted} invalid states, ${accidentalWins} random solves`);
}

console.log(`\n${failures === 0 ? 'GATE: PASS' : `GATE: FAIL (${failures} failing check${failures === 1 ? '' : 's'})`}`);
process.exit(failures === 0 ? 0 : 1);
