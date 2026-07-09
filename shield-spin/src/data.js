// Shield Spin — game tunables and theme data.
// Financial concept: timing your protection right — add covers to the Life Wheel
// without conflicts (never double-cover the same slot, avoid uncovered risks).

export const BRAND = {
  blue: '#003DA6',
  blueBright: '#1E6FE0',
  orange: '#F26522',
  orangeBright: '#FF8A47',
  green: '#28A745',
  greenBright: '#4ADE80',
  bgDeep: '#050f24',
  gold: '#FFC845',
  goldDeep: '#B97E10',
  danger: '#EF4444',
  dangerDeep: '#7F1D1D',
};

// Life Wheel segments — each slice is a life goal the player is protecting.
// Icons are drawn as programmatic canvas vector art (see ShieldSpin.jsx drawSegmentIcon).
export const WHEEL_SEGMENTS = [
  { id: 'family',    label: 'Family',    color: '#1E6FE0', deep: '#0B3B8F' },
  { id: 'home',      label: 'Home',      color: '#7C5CFC', deep: '#3F2E96' },
  { id: 'health',    label: 'Health',    color: '#E24A6A', deep: '#7E1E36' },
  { id: 'education', label: 'Education', color: '#12A5B8', deep: '#095E6A' },
  { id: 'savings',   label: 'Savings',   color: '#2FA84F', deep: '#155E2B' },
  { id: 'travel',    label: 'Travel',    color: '#E88A1A', deep: '#8A4D07' },
];

export const GAME_CONFIG = {
  sessionSeconds: 120,          // hard cap — 2 minutes
  lives: 3,
  dartsPerWheel: 8,             // land all 8 => wheel cleared
  bossEvery: 3,                 // every 3rd wheel is a boss wheel with erratic spin

  // Scoring
  scorePerDart: 50,
  scorePerCoin: 100,
  scorePerWheel: 300,

  // Wheel motion (radians / second)
  baseSpeed: 1.5,
  speedPerLevel: 0.28,
  maxSpeed: 4.2,

  // Collision windows (radians)
  dartGap: 0.17,                // min angular distance between stuck darts
  riskHalfWidth: 0.15,          // red risk node hit window
  coinHalfWidth: 0.15,          // gold coin collect window

  // Dart flight
  dartSpeed: 2600,              // px / second

  // Hazard / bonus counts
  baseRisks: 1,
  riskPerLevels: 2,             // +1 risk every N levels
  maxRisks: 4,
  coinsPerWheel: 2,
};
