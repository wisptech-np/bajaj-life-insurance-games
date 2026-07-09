// data.js — all Premium Tiles tunables in one place.
// Financial concept: premium payment discipline — never miss a due date.

export const BRAND = {
  blue: '#003DA6',
  orange: '#F26522',
  green: '#28A745',
  bgDark: '#0B1221',
};

export const GAME_CONFIG = {
  // Session shape
  duration: 90,          // seconds of survival = win (hard cap << 2 min)
  lanes: 4,

  // Tile stream
  tileHeight: 116,       // css px
  baseSpeed: 250,        // css px / second at Year 1
  speedRamp: 1.13,       // multiplier applied at every new policy year
  yearInterval: 15,      // seconds per policy year -> 6 years in a 90s session
  gapFactorStart: 1.70,  // vertical spacing between tiles (x tileHeight)
  gapFactorMin: 1.34,    // spacing floor at max difficulty

  // Tile mix
  goldChance: 0.08,      // bonus tile probability
  redChanceStart: 0.10,  // lapse tile probability at Year 1
  redChanceMax: 0.22,    // lapse tile probability cap

  // Scoring
  baseTileScore: 10,     // score = tiles x 10 x combo multiplier
  comboTierSize: 10,     // every 10 streak raises the multiplier
  maxMultiplier: 5,
  goldMultiplier: 2,     // gold tile doubles the tap score
  feverStreak: 30,       // streak that ignites Fever Mode (double points)
};
