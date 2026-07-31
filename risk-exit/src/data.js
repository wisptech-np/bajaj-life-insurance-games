// Risk Exit — tunables, block skins and the shipped level set.
//
// A 6x6 sliding-block escape puzzle. Every red block is a real financial risk
// wedged across the family's path; the gold FAMILY COVER block is the only
// piece that can leave the board, and only through the exit gate on the right
// wall of row 2.
//
// LEVELS below are hand-authored grid layouts. `par` is NOT a guess — it is
// the exact breadth-first minimum drag count printed by `node gate.mjs`, which
// re-solves every board from src/rules.js on every run. Change a layout and
// the gate fails until you update the par.

export const BRAND = {
  blue: '#003DA6',
  blueLight: '#2F6FD8',
  orange: '#F26522',
  orangeBright: '#FF8533',
  green: '#28A745',
  greenLight: '#4ADE80',
  red: '#DC2626',
  gold: '#FFC845',
  bgDeep: '#060d1f',
};

/** The hero: warm gold, the only block that reads as "yours". */
export const HERO_SKIN = {
  top: '#FFE9A6',
  mid: '#FFC845',
  bottom: '#B4780C',
  rim: 'rgba(255, 252, 224, 0.95)',
  glow: 'rgba(255, 200, 69, 0.55)',
};

/**
 * The four obstructing risks. All red-family so "red = risk" reads instantly,
 * but each has its own tone and its own drawn glyph so the four are tellable
 * apart at a glance on a 320 px board.
 */
export const RISK_SKINS = {
  debt:    { label: 'Debt',         top: '#FCA5A5', mid: '#E23D3D', bottom: '#7A1414', rim: 'rgba(255,220,220,0.85)', glow: 'rgba(226,61,61,0.5)' },
  illness: { label: 'Illness',      top: '#FDA4C4', mid: '#D6336C', bottom: '#6D1030', rim: 'rgba(255,224,238,0.85)', glow: 'rgba(214,51,108,0.5)' },
  market:  { label: 'Market Shock', top: '#FBA98B', mid: '#D2451C', bottom: '#6B1D06', rim: 'rgba(255,231,214,0.85)', glow: 'rgba(210,69,28,0.5)' },
  job:     { label: 'Job Loss',     top: '#E0A3B8', mid: '#A32B4D', bottom: '#530A1F', rim: 'rgba(250,222,232,0.85)', glow: 'rgba(163,43,77,0.5)' },
};

export const LEVELS = [
  {
    id: 1,
    name: 'Early Career',
    par: 4,
    // . . . C . .      X = family cover      C/E/F = risks in the exit lane
    // . . . C E .
    // X X B . E F  >   <- exit gate
    // . . B . . F
    // . . B . D .
    // . . . . D .
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'market',  r: 2, c: 2, len: 3, dir: 'v' },
      { id: 'c',     kind: 'illness', r: 0, c: 3, len: 2, dir: 'v' },
      { id: 'd',     kind: 'job',     r: 4, c: 4, len: 2, dir: 'v' },
      { id: 'e',     kind: 'illness', r: 1, c: 4, len: 2, dir: 'v' },
      { id: 'f',     kind: 'debt',    r: 2, c: 5, len: 2, dir: 'v' },
    ],
  },
  {
    id: 2,
    name: 'New Home Loan',
    par: 5,
    // . . E E . .
    // . . . . . .
    // X X D . B C  >
    // . . D . B C
    // F F F . B .
    // . . . . . .
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'market',  r: 2, c: 4, len: 3, dir: 'v' },
      { id: 'c',     kind: 'job',     r: 2, c: 5, len: 2, dir: 'v' },
      { id: 'd',     kind: 'debt',    r: 2, c: 2, len: 2, dir: 'v' },
      { id: 'e',     kind: 'illness', r: 0, c: 2, len: 2, dir: 'h' },
      { id: 'f',     kind: 'market',  r: 4, c: 0, len: 3, dir: 'h' },
    ],
  },
  {
    id: 3,
    name: 'Family Grows',
    par: 6,
    // . . B . . .
    // . . B . . .
    // X X B D E .  >
    // F . . D E .
    // F C C D . .
    // F . . . . .
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'market',  r: 0, c: 2, len: 3, dir: 'v' },
      { id: 'c',     kind: 'job',     r: 4, c: 1, len: 2, dir: 'h' },
      { id: 'd',     kind: 'debt',    r: 2, c: 3, len: 3, dir: 'v' },
      { id: 'e',     kind: 'illness', r: 2, c: 4, len: 2, dir: 'v' },
      { id: 'f',     kind: 'debt',    r: 3, c: 0, len: 3, dir: 'v' },
    ],
  },
  {
    id: 4,
    name: 'Mid-Life Squeeze',
    par: 8,
    // . . . . . .
    // . . . B G .
    // X X D B G .  >
    // . . D E E .
    // . . D . C .
    // . F F F C .
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'illness', r: 1, c: 3, len: 2, dir: 'v' },
      { id: 'c',     kind: 'job',     r: 4, c: 4, len: 2, dir: 'v' },
      { id: 'd',     kind: 'market',  r: 2, c: 2, len: 3, dir: 'v' },
      { id: 'e',     kind: 'job',     r: 3, c: 3, len: 2, dir: 'h' },
      { id: 'f',     kind: 'debt',    r: 5, c: 1, len: 3, dir: 'h' },
      { id: 'g',     kind: 'illness', r: 1, c: 4, len: 2, dir: 'v' },
    ],
  },
  {
    id: 5,
    name: 'Market Downturn',
    par: 10,
    // . . E . . .
    // . . E B C H
    // X X E B C H  >
    // F F . . . H
    // . D D D . .
    // . . . G G G
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'job',     r: 1, c: 3, len: 2, dir: 'v' },
      { id: 'c',     kind: 'illness', r: 1, c: 4, len: 2, dir: 'v' },
      { id: 'd',     kind: 'debt',    r: 4, c: 1, len: 3, dir: 'h' },
      { id: 'e',     kind: 'market',  r: 0, c: 2, len: 3, dir: 'v' },
      { id: 'f',     kind: 'job',     r: 3, c: 0, len: 2, dir: 'h' },
      { id: 'g',     kind: 'debt',    r: 5, c: 3, len: 3, dir: 'h' },
      { id: 'h',     kind: 'market',  r: 1, c: 5, len: 3, dir: 'v' },
    ],
  },
  {
    id: 6,
    name: 'Full Portfolio',
    par: 11,
    // . F F F . .
    // . . . . E H
    // X X B . E H  >
    // . . B . . D
    // . . G C C D
    // . . G . . .
    pieces: [
      { id: 'cover', kind: 'hero',    r: 2, c: 0, len: 2, dir: 'h' },
      { id: 'b',     kind: 'illness', r: 2, c: 2, len: 2, dir: 'v' },
      { id: 'c',     kind: 'job',     r: 4, c: 3, len: 2, dir: 'h' },
      { id: 'd',     kind: 'job',     r: 3, c: 5, len: 2, dir: 'v' },
      { id: 'e',     kind: 'illness', r: 1, c: 4, len: 2, dir: 'v' },
      { id: 'f',     kind: 'debt',    r: 0, c: 1, len: 3, dir: 'h' },
      { id: 'g',     kind: 'market',  r: 4, c: 2, len: 2, dir: 'v' },
      { id: 'h',     kind: 'market',  r: 1, c: 5, len: 2, dir: 'v' },
    ],
  },
];

export const GAME_CONFIG = {
  gridSize: 6,
  sessionSeconds: 120,   // hard cap — 2 minutes for the whole ladder
  levelBannerMs: 1300,
  scoring: {
    levelClear: 200,     // per board escaped
    parBonus: 150,       // full at par, scaled down by par/movesUsed
    riskCleared: 40,     // per risk block shoved clear of the exit lane
    blocked: -5,         // shoving a block into a neighbour it cannot pass
    timeBonusPerSec: 10, // on a full clear
  },
};

export const TARGET_SCORE = 2800; // results-ring target
