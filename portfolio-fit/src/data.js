// Portfolio Fit — game data.
// Each block piece belongs to an asset class. Fit every asset class into the
// 9x9 portfolio grid; complete rows/columns to "rebalance" the portfolio.

export const ASSETS = {
  equity: {
    id: 'equity',
    name: 'Equity',
    tagline: 'Growth engine',
    color: '#F26522',
    deep: '#9A3B08',
    light: '#FFA05C',
    glow: 'rgba(242, 101, 34, 0.65)',
  },
  debt: {
    id: 'debt',
    name: 'Debt',
    tagline: 'Steady income',
    color: '#2F7BFF',
    deep: '#0A3C8F',
    light: '#8AB6FF',
    glow: 'rgba(47, 123, 255, 0.65)',
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    tagline: 'Inflation hedge',
    color: '#F2B705',
    deep: '#8F6400',
    light: '#FFE082',
    glow: 'rgba(242, 183, 5, 0.65)',
  },
  insurance: {
    id: 'insurance',
    name: 'Insurance',
    tagline: 'Protection first',
    color: '#28A745',
    deep: '#0E5A24',
    light: '#7FE39A',
    glow: 'rgba(40, 167, 69, 0.65)',
    shield: true, // gets the animated shield sheen
  },
};

export const ASSET_KEYS = Object.keys(ASSETS);

// Shape cells are [row, col] offsets from the piece's top-left.
// tier: 0 = easy/small, 1 = medium, 2 = large. No rotation in play —
// each orientation is its own shape, exactly like 1010!.
export const SHAPES = [
  { id: 'dot',  tier: 0, cells: [[0, 0]] },
  { id: 'h2',   tier: 0, cells: [[0, 0], [0, 1]] },
  { id: 'v2',   tier: 0, cells: [[0, 0], [1, 0]] },
  { id: 'h3',   tier: 0, cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'v3',   tier: 0, cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'l3a',  tier: 0, cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'l3b',  tier: 0, cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'l3c',  tier: 0, cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'l3d',  tier: 0, cells: [[0, 1], [1, 0], [1, 1]] },
  { id: 'sq2',  tier: 1, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'h4',   tier: 1, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'v4',   tier: 1, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'h5',   tier: 2, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'v5',   tier: 2, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'L5a',  tier: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: 'L5b',  tier: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { id: 'L5c',  tier: 2, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: 'L5d',  tier: 2, cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: 'sq3',  tier: 2, cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
];

export const GAME_CONFIG = {
  grid: 9,               // 9x9 board
  duration: 120,         // hard cap: 2-minute session
  lineScore: 100,        // points per cleared row/column
  diversifyMult: 2,      // x2 when a cleared line holds all 4 asset classes
  streakBonus: 50,       // extra per streak level on consecutive clearing drops
  targetScore: 1500,     // results-ring target
  // Difficulty ramp: tier weights [tier0, tier1, tier2] per phase of the session.
  phaseWeights: [
    [0.62, 0.28, 0.10],  // 0–40s: mostly small pieces
    [0.42, 0.34, 0.24],  // 40–80s: mixed
    [0.28, 0.34, 0.38],  // 80–120s: big pieces dominate
  ],
};
