// data.js — Guardian Shelter tunables + hand-designed rounds.
// Logical playfield: 400 wide. Ground top at y = GROUND_Y. Tray sits below the field.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  virus: '#49E24B',
  virusDeep: '#0E5C1D',
  bgTop: '#051a3a',
  bgMid: '#0e3a74',
};

export const GAME_CONFIG = {
  // Session
  sessionSeconds: 120,          // hard cap
  totalRounds: 6,

  // Scoring
  scorePerMemberSaved: 100,
  scorePerUnusedShield: 50,
  timeBonusPerSecond: 5,        // awarded on clearing all rounds

  // Physics (logical px/s)
  gravity: 1500,
  virusRadius: 9,
  virusRestitution: 0.5,
  virusMaxBounces: 4,
  virusLifeSeconds: 4.5,

  // Placement
  autoGoSeconds: 3,             // countdown once every shield is placed

  // Playfield geometry (logical units)
  fieldWidth: 400,
  fieldHeight: 580,
  groundY: 462,
  trayY: 476,
  emitterY: 54,
};

// Shield archetypes — collision boxes are AABB for support/stacking.
// Umbrella additionally deflects viruses with its dome circle for satisfying bounces.
export const SHIELD_TYPES = {
  umbrella: { w: 74, h: 64, domeR: 37, label: 'Umbrella' },
  crate:    { w: 52, h: 52, label: 'Crate' },
  barrel:   { w: 46, h: 56, label: 'Barrel' },
};

// Family member archetypes (vector-drawn). r = hit circle radius.
export const MEMBER_TYPES = {
  dad:     { r: 17, body: '#1E6BE0', accent: '#003DA6', skin: '#F2C29B', label: 'Dad' },
  mom:     { r: 17, body: '#F26522', accent: '#C2470F', skin: '#EDB48A', label: 'Mom' },
  kid:     { r: 14, body: '#28A745', accent: '#146C2E', skin: '#F2C29B', label: 'Kid' },
  grandpa: { r: 17, body: '#7A89B8', accent: '#4B5878', skin: '#E8B48E', label: 'Grandpa' },
};

// 6 hand-designed rounds, rising complexity.
// members: { type, x, on: 'ground' | platformIndex }
// platforms: { x, y, w, h } (x,y = top-left, logical units)
// shields: tray contents; storm: emitter behaviour.
export const LEVELS = [
  {
    name: 'First Shower',
    members: [{ type: 'kid', x: 200, on: 'ground' }],
    platforms: [],
    shields: ['umbrella'],
    storm: { passes: 1, speed: 120, spawnEvery: 0.22, drift: 0 },
  },
  {
    name: 'Two To Cover',
    members: [
      { type: 'mom', x: 108, on: 'ground' },
      { type: 'dad', x: 292, on: 'ground' },
    ],
    platforms: [],
    shields: ['umbrella', 'umbrella'],
    storm: { passes: 1, speed: 130, spawnEvery: 0.19, drift: 20 },
  },
  {
    name: 'High Ground',
    members: [
      { type: 'kid', x: 96, on: 'ground' },
      { type: 'dad', x: 300, on: 0 },
    ],
    platforms: [{ x: 238, y: 356, w: 126, h: 18 }],
    shields: ['umbrella', 'crate'],
    storm: { passes: 1, speed: 130, spawnEvery: 0.17, drift: 30 },
  },
  {
    name: 'Family Of Three',
    members: [
      { type: 'grandpa', x: 62, on: 'ground' },
      { type: 'kid', x: 202, on: 'ground' },
      { type: 'mom', x: 338, on: 'ground' },
    ],
    platforms: [],
    shields: ['umbrella', 'crate', 'barrel'],
    storm: { passes: 1, speed: 140, spawnEvery: 0.15, drift: 45 },
  },
  {
    name: 'Split Levels',
    members: [
      { type: 'mom', x: 92, on: 0 },
      { type: 'grandpa', x: 210, on: 'ground' },
      { type: 'dad', x: 330, on: 'ground' },
    ],
    platforms: [{ x: 40, y: 338, w: 118, h: 18 }],
    shields: ['umbrella', 'umbrella', 'crate'],
    storm: { passes: 2, speed: 165, spawnEvery: 0.15, drift: 55 },
  },
  {
    name: 'The Full House',
    members: [
      { type: 'dad', x: 58, on: 'ground' },
      { type: 'kid', x: 148, on: 'ground' },
      { type: 'mom', x: 252, on: 0 },
      { type: 'grandpa', x: 344, on: 'ground' },
    ],
    platforms: [{ x: 196, y: 350, w: 116, h: 18 }],
    shields: ['umbrella', 'umbrella', 'crate', 'barrel'],
    storm: { passes: 2, speed: 175, spawnEvery: 0.125, drift: 70 },
  },
];
