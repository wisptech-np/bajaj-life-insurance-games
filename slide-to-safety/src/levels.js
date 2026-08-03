// levels.js — the five handcrafted boards of Slide to Safety, as ASCII maps.
//
// Pure data plus a parser. No DOM, no React, no kit imports: scripts/balance.mjs
// imports this file directly under node and proves every board with a BFS over
// the slide graph, so what the solver checks is literally what ships.
//
// ─── LEGEND ──────────────────────────────────────────────────────────────────
//
//   .   ice          Empty frozen tile. The token glides straight over it.
//   #   rock         Solid block. A slide stops in the cell BEFORE the rock.
//   S   start        Where the shield token spawns (plain ice underneath).
//   F   family       The goal tile, and it is STICKY: any slide whose path
//                    crosses it stops on it and finishes the level.
//   P   cover point  The insurance-themed SAFE ZONE, and also STICKY: the cover
//                    catches the shield, so it creates a stop where the open ice
//                    had none. Resting on one does three things, all mechanical:
//                      1. BANKS the run — it becomes the respawn cell, so the
//                         next fall costs a retry instead of the whole board;
//                      2. RESTORES the ice — every fracture the player has
//                         deepened on this board re-freezes, which re-opens
//                         corridors already spent;
//                      3. SCORES `scoring.coverBonus`, once per board (a retry
//                         does not restock it).
//   C   coin         Ice + a premium coin. Collected by passing over OR stopping
//                    on it, once per level (a retry does not restock it).
//   X   crack        Thin ice. Crossing INTACT thin ice at speed is safe exactly
//                    once and deepens the crack. Crossing an already-deepened
//                    crack — or STOPPING on any crack — breaks it: the token
//                    falls through, the level restarts at the last cover point
//                    reached (or the start tile), and one retry is spent.
//   ^   gust up      Wind cell. Shoves a HORIZONTAL slide one cell up.
//   v   gust down    Wind cell. Shoves a HORIZONTAL slide one cell down.
//   <   gust left    Wind cell. Shoves a VERTICAL slide one cell left.
//   >   gust right   Wind cell. Shoves a VERTICAL slide one cell right.
//
// Gust rules (see resolveSlide in slide.js for the implementation):
//   * A gust only acts on a slide crossing it PERPENDICULAR to its push, which
//     is why a downdraft lane is drawn as a column of `v` and is felt only by
//     slides travelling left/right through it.
//   * The shove moves the token one cell and the slide then CONTINUES in its
//     original direction from the new cell.
//   * The shove is cancelled outright if the destination is a rock or off-grid —
//     wind cannot push you into stone.
//   * A cell reached BY a shove never re-triggers a gust, so a lane can deflect
//     a given slide at most once and no arrangement of gusts can loop.
//
// Rows are written top (r = 0) to bottom (r = 8); spaces are decoration and are
// stripped by the parser, so a map row must hold exactly GRID_COLS symbols.

export const GRID_COLS = 7;
export const GRID_ROWS = 9;

export const TILE_ICE = 0;
export const TILE_ROCK = 1;
export const TILE_GOAL = 2;
export const TILE_COVER = 3;

/** Push vector for each gust glyph. */
const GUST = {
  '^': { dx: 0, dy: -1 },
  v: { dx: 0, dy: 1 },
  '<': { dx: -1, dy: 0 },
  '>': { dx: 1, dy: 0 },
};

/**
 * The five boards.
 *
 * `par` is the optimal move count and is NOT hand-authored guesswork: it is
 * asserted equal to the BFS optimum by scripts/balance.mjs, which fails the
 * build gate on any mismatch. Difficulty is carried by the shape of the board
 * (turns, thin ice on the tempting wrong swipe, a gust that moves the line, a
 * cover point that catches a glide the open ice would have let run), never by
 * hidden rules.
 *
 * ─── DIFFICULTY RAMP (gated, see balance.mjs gate 6) ────────────────────────
 *
 *   board            new mechanic     par   hazards   what it asks for
 *   1 First Steps    —  (the verb)     6      0       aim, read the stop, go
 *   2 Thin Ice       thin ice          8      8       cross at speed, never rest
 *   3 Crosswind      gust lane         9     13       plan around a deflection
 *   4 Cover Point    cover point      11     10       spend moves to bank safety
 *   5 Bring Them...  — (all three)    13     15       everything, twice as long
 *
 * Three rules the ramp obeys, all asserted rather than asserted-to:
 *   * par strictly increases board to board;
 *   * no board introduces two new mechanics at once, and the last board carries
 *     every mechanic;
 *   * board 1 has no hazards at all, and the final board has the most.
 * The measured skilled-bot fall rate per board is printed with them, so the
 * ramp is evidenced behaviourally and not only by counting furniture.
 */
export const LEVEL_DEFS = [
  {
    id: 'first-steps',
    name: 'First Steps',
    subtitle: 'Hold to aim, let go to commit. The shield glides until something stops it.',
    par: 6,
    // Teaching board: no thin ice, no wind. Four rocks turn the lake into a
    // staircase, and all four coins sit on the optimal line, so a player who
    // simply follows the obvious route is rewarded rather than tested.
    map: [
      '. . . . . . .',
      '. . . . . . .',
      '. . . . . . #',
      '# . . . F . .',
      '. . C . # . .',
      '. . . . . . C',
      'C . . C . . .',
      '. . . . . . .',
      'S . . # . . .',
    ],
  },
  {
    id: 'thin-ice',
    name: 'Thin Ice',
    subtitle: 'Cross thin ice at speed. Never stop on it.',
    par: 8,
    // Thin ice arrives. The optimal line crosses three cracks at speed — safe,
    // and each one visibly deepens behind the token — while most of the tempting
    // wrong swipes end ON thin ice. The opening four moves are single cells: the
    // board teaches that a short, deliberate nudge is a legal move too.
    map: [
      '. . . . . . #',
      '# . . . . . X',
      '. . . X C . .',
      'X . . . . . .',
      'C . . . . . C',
      '. # F . C X .',
      '. . # . . . #',
      '# . . . . . X',
      'X X S . . . X',
    ],
  },
  {
    id: 'crosswind',
    name: 'Crosswind',
    subtitle: 'The gust lane shoves you one cell as you pass.',
    par: 9,
    // One patrolling crosswind (the row of `<`). Every up/down slide crossing
    // row 2 between columns 0 and 3 lands one column further left than aimed.
    // Flatten those four cells to plain ice and the family tile is unreachable,
    // so the gust is the level: the optimal line rides it on moves 5 and 6.
    map: [
      'X X . . X X #',
      '. . . . . . X',
      '< < < < . . .',
      '. . . . . . .',
      '. C . C . . .',
      '# . X . . # .',
      '. # . C . . X',
      '. F C . . X .',
      '. # . . # S X',
    ],
  },
  {
    id: 'cover-point',
    name: 'Cover Point',
    subtitle: 'The cover point catches you, re-freezes the ice and banks the board.',
    par: 11,
    // The safe zone arrives, on a long two-crossing route over ice that is more
    // fracture than floe. The cover point at (2,1) sits mid-lake on the northern
    // leg: it CATCHES a slide the open ice would have let run to the shore, which
    // is why flattening it to plain ice drops the optimum from 11 back to 10 —
    // the board is measurably built around it (balance.mjs gate 5).
    //
    // What the player gets for the move it costs: every fracture already
    // deepened re-freezes, so the southern crossings can be re-used, and a fall
    // after it restarts here instead of at (0,7) on the far shore.
    map: [
      '. . . . X . X',
      'X . P . . . .',
      'C . . . . . #',
      '. # . X C . .',
      '. X C . . # X',
      '# . . . . . C',
      'X # . . X F .',
      'S . X C . . .',
      'X . # # . . #',
    ],
  },
  {
    id: 'bring-them-home',
    name: 'Bring Them Home',
    subtitle: 'Thin ice, a gust, and two cover points between you and the family.',
    par: 13,
    // The finale: everything at once. A crosswind along the bottom shore, eleven
    // fractures, and two cover points — (4,3) mid-lake and (1,7) on the south
    // shore — one on each half of the route, so the board can be banked halfway
    // and the ice spent on the first half restored for the second.
    //
    // scripts/balance.mjs measures the family tile as UNREACHABLE with the gust
    // cells flattened, and the optimum as 12 rather than 13 with the cover points
    // flattened. Neither mechanic is decoration.
    map: [
      'X . X . X . X',
      '. # . . . F #',
      '# . X C . . .',
      '. . . # P . .',
      'X C . . . . #',
      '. . . C . X S',
      '. . C X C # X',
      '. P . . . . #',
      'X < < < < X #',
    ],
  },
];

/** Everything the game and the solver need about one board, precomputed. */
export function parseLevel(def, index = 0) {
  const rows = def.map.length;
  if (rows !== GRID_ROWS) {
    throw new Error(`level ${def.id}: expected ${GRID_ROWS} rows, got ${rows}`);
  }

  const cols = GRID_COLS;
  const n = cols * rows;
  const tiles = new Uint8Array(n);
  // -1 = none, otherwise an index into coins / cracks / winds / covers.
  const coinAt = new Int16Array(n).fill(-1);
  const crackAt = new Int16Array(n).fill(-1);
  const windAt = new Int16Array(n).fill(-1);
  const coverAt = new Int16Array(n).fill(-1);

  const coins = [];
  const cracks = [];
  const winds = [];
  const covers = [];
  let start = null;
  let goal = null;

  for (let r = 0; r < rows; r++) {
    const line = def.map[r].replace(/\s+/g, '');
    if (line.length !== cols) {
      throw new Error(`level ${def.id} row ${r}: expected ${cols} cells, got ${line.length}`);
    }
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      const k = r * cols + c;
      switch (ch) {
        case '.':
          break;
        case '#':
          tiles[k] = TILE_ROCK;
          break;
        case 'S':
          if (start) throw new Error(`level ${def.id}: more than one start`);
          start = { c, r };
          break;
        case 'F':
          if (goal) throw new Error(`level ${def.id}: more than one family tile`);
          tiles[k] = TILE_GOAL;
          goal = { c, r };
          break;
        case 'P':
          tiles[k] = TILE_COVER;
          coverAt[k] = covers.length;
          covers.push({ c, r });
          break;
        case 'C':
          coinAt[k] = coins.length;
          coins.push({ c, r });
          break;
        case 'X':
          crackAt[k] = cracks.length;
          cracks.push({ c, r });
          break;
        case '^':
        case 'v':
        case '<':
        case '>':
          windAt[k] = winds.length;
          winds.push({ c, r, dx: GUST[ch].dx, dy: GUST[ch].dy, glyph: ch });
          break;
        default:
          throw new Error(`level ${def.id} (${c},${r}): unknown symbol "${ch}"`);
      }
    }
  }

  if (!start) throw new Error(`level ${def.id}: no start tile`);
  if (!goal) throw new Error(`level ${def.id}: no family tile`);

  return {
    index,
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    par: def.par,
    cols,
    rows,
    tiles,
    coinAt,
    crackAt,
    windAt,
    coverAt,
    coins,
    cracks,
    winds,
    covers,
    start,
    goal,
  };
}

/** The parsed boards, in play order. Parsing is cheap and happens once. */
export const LEVELS = LEVEL_DEFS.map(parseLevel);

/** Sum of every par — the "perfect run" move count quoted on the screens. */
export const TOTAL_PAR = LEVELS.reduce((a, lv) => a + lv.par, 0);
