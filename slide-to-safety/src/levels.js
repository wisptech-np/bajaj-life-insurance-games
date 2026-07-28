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
//   C   coin         Ice + a premium coin. Collected by passing over OR stopping
//                    on it, once per level (a retry does not restock it).
//   X   crack        Thin ice. Crossing INTACT thin ice at speed is safe exactly
//                    once and deepens the crack. Crossing an already-deepened
//                    crack — or STOPPING on any crack — breaks it: the token
//                    falls through, the level restarts, and one of the three
//                    retries is spent.
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
 * (turns, thin ice on the tempting wrong swipe, a gust that moves the line),
 * never by hidden rules.
 */
export const LEVEL_DEFS = [
  {
    id: 'first-steps',
    name: 'First Steps',
    subtitle: 'Swipe. The shield glides until something stops it.',
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
    id: 'cold-snap',
    name: 'Cold Snap',
    subtitle: 'No wind here. Just a long route and thin ice.',
    par: 10,
    // Pure route planning: ten moves that cross the whole lake twice over ice
    // that is more fracture than floe. Six of the ten legs cross thin ice at
    // speed, so the board is a rolling record of where you have already been —
    // any route that doubles back over its own crossings goes through.
    map: [
      '. . . . X . X',
      'X . . . . . .',
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
    subtitle: 'Thin ice and a gust between you and the family.',
    par: 12,
    // The finale. A crosswind along the bottom shore plus eleven fractures.
    // scripts/balance.mjs measures the family tile as UNREACHABLE with the gust
    // cells flattened to plain ice, so the wind is not decoration: the optimal
    // line rides it twice, on moves 4 and 9.
    map: [
      'X . X . X . X',
      '. # . . . F #',
      '# . X C . . .',
      '. . . # . . .',
      'X C . . . . #',
      '. . . C . X S',
      '. . C X C # X',
      '. . . . . . #',
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
  // -1 = none, otherwise an index into coins / cracks / winds.
  const coinAt = new Int16Array(n).fill(-1);
  const crackAt = new Int16Array(n).fill(-1);
  const windAt = new Int16Array(n).fill(-1);

  const coins = [];
  const cracks = [];
  const winds = [];
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
    coins,
    cracks,
    winds,
    start,
    goal,
  };
}

/** The parsed boards, in play order. Parsing is cheap and happens once. */
export const LEVELS = LEVEL_DEFS.map(parseLevel);

/** Sum of every par — the "perfect run" move count quoted on the screens. */
export const TOTAL_PAR = LEVELS.reduce((a, lv) => a + lv.par, 0);
