// Risk Exit — game tunables + brand palette.
// A 6x6 arrow-escape puzzle: tap arrows to slide them off the board.
// Red "risk" blocks teach order-of-decisions — clear them LAST or they
// lock their neighbours.

export const BRAND = {
  blue: '#003DA6',
  blueLight: '#2F6FD8',
  orange: '#F26522',
  orangeBright: '#FF8533',
  green: '#28A745',
  greenLight: '#4ADE80',
  red: '#DC2626',
  redDeep: '#7F1D1D',
  bgDeep: '#0B1221',
};

// Direction → colour coding (readability aid: same-direction arrows share a hue).
export const DIR_COLORS = {
  up:    { top: '#4ADE80', bottom: '#1B7A33', glow: 'rgba(74,222,128,0.55)' },   // green
  down:  { top: '#5B8DEF', bottom: '#012B72', glow: 'rgba(91,141,239,0.55)' },   // brand blue
  left:  { top: '#FF9A4D', bottom: '#C24A0E', glow: 'rgba(242,101,34,0.55)' },   // brand orange
  right: { top: '#7DD3FC', bottom: '#0B5394', glow: 'rgba(125,211,252,0.55)' },  // sky blue
};

export const RISK_COLORS = { top: '#F87171', bottom: '#7F1D1D', glow: 'rgba(220,38,38,0.6)' };

export const GAME_CONFIG = {
  gridSize: 6,
  sessionSeconds: 120,          // hard cap — 2 minutes
  // 5 escalating boards. Risk blocks are always solvable LAST.
  levels: [
    { blocks: 8,  risks: 0 },
    { blocks: 11, risks: 1 },
    { blocks: 14, risks: 1 },
    { blocks: 17, risks: 2 },
    { blocks: 20, risks: 2 },
  ],
  scoring: {
    exit: 50,            // per successful exit
    comboStep: 15,       // extra per consecutive exit (combo - 1) * step
    comboCap: 8,         // combo multiplier cap
    bump: -10,           // wrong-order tap
    riskBreach: -25,     // risk block cleared while normal blocks remain
    riskSafeBonus: 100,  // risk block cleared last — the smart decision
    timeBonusPerSec: 10, // added on win
  },
  lockSeconds: 4,        // neighbour lockdown after a risk breach
  slideCellsPerSec: 22,  // slide animation speed
  levelBannerMs: 1100,   // "BOARD n" banner duration
};

export const TARGET_SCORE = 1500; // results-ring target
