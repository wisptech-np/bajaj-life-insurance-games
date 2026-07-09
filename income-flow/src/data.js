// Income Flow — pipe-rotation flow puzzle. All tunables live here.
// Financial hook: route your SALARY into a lifelong RETIREMENT income stream.

export const BRAND = {
  blue: '#003DA6',
  orange: '#F26522',
  green: '#28A745',
  gold: '#FFC845',
  goldDeep: '#E8940A',
  bgTop: '#051a3a',
  bgMid: '#0e4f94',
};

export const GAME_CONFIG = {
  gridSize: 6,
  boards: 4,                        // 4 boards per session
  sessionSeconds: 120,              // hard cap 2 minutes
  planSeconds: [10, 9, 8, 7],       // planning phase per board (ramps down)
  flowStepMs: [1200, 1050, 950, 850], // liquid advances tile-by-tile (ramps up)
  lives: 3,
  fixPauseMs: 3000,                 // board pauses after a leak so player can fix
  shieldsPerBoard: [0, 1, 1, 2],    // rare leak-blocking shield valves
  extraTurnChance: 0.22,            // chance a path tile is upgraded to T/cross
  scoring: {
    boardBase: 250,                 // per board cleared
    efficiencyPerTile: 12,          // x (36 - tiles used by liquid)
    planBonusPerSec: 15,            // x planning seconds left when flow released early
    timeBonusPerSec: 8,             // x session seconds left on final win
    vaultPerPercent: 2,             // x vault fill % on final win
    leakPenalty: 50,
  },
};
