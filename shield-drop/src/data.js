// data.js — Shield Drop tunables + level layouts.
// All level coordinates are normalized: x is a fraction of canvas width, y a fraction of canvas height.
// Radii use `r` as a fraction of canvas width unless noted.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#2F6FD1',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  gold: '#FFC845',
  goldDeep: '#E8960C',
  bgTop: '#051a3a',
  bgMid: '#0e3a74',
  bgLow: '#0B1221',
  danger: '#3DDC5B',
};

export const GAME_CONFIG = {
  sessionSeconds: 120,       // hard cap — 2 minute session
  levelScore: 300,           // score per level cleared
  coinScore: 50,             // score per star coin collected
  timeBonusPerSec: 5,        // bonus on finishing all levels
  sawPenaltySec: 6,          // time lost when the shield is destroyed
  missPenaltySec: 4,         // time lost when the shield falls off screen
  gravity: 2400,             // px/s^2 at reference height (800px)
  refHeight: 800,
  ropeSegments: 14,          // verlet points per rope
  constraintIterations: 7,
  physicsStep: 1 / 120,
  shieldRadius: 0.062,       // fraction of width
  buoyancy: -0.52,           // gravity multiplier while inside a bubble
  bubbleDrag: 0.9965,        // per-substep damping while floating
  pufferCooldown: 0.55,      // seconds
  pufferRange: 0.62,         // fraction of height
  pufferPower: 620,          // impulse at zero distance (scaled by height/800)
};

// ─── Level layouts — difficulty ramps across the 6 deliveries ───
export const LEVELS = [
  {
    name: 'First Drop',
    hint: 'Swipe the rope to cut it',
    shield: { x: 0.5, y: 0.4 },
    ropes: [{ anchor: { x: 0.5, y: 0.1 } }],
    stars: [
      { x: 0.5, y: 0.56 },
      { x: 0.5, y: 0.66 },
      { x: 0.5, y: 0.76 },
    ],
    saws: [],
    bubbles: [],
    puffers: [],
    basket: { x: 0.5, y: 0.875 },
  },
  {
    name: 'The Swing',
    hint: 'Cut one rope, swing, then release',
    shield: { x: 0.5, y: 0.34 },
    ropes: [
      { anchor: { x: 0.2, y: 0.1 } },
      { anchor: { x: 0.8, y: 0.1 } },
    ],
    stars: [
      { x: 0.56, y: 0.44 },
      { x: 0.66, y: 0.5 },
      { x: 0.76, y: 0.52 },
      { x: 0.76, y: 0.7 },
    ],
    saws: [],
    bubbles: [],
    puffers: [],
    basket: { x: 0.76, y: 0.875 },
  },
  {
    name: 'Moving Anchor',
    hint: 'Time the cut — dodge the virus saw',
    shield: { x: 0.5, y: 0.42 },
    ropes: [
      { anchor: { x: 0.5, y: 0.1, ampX: 0.22, period: 3.4 } },
    ],
    stars: [
      { x: 0.68, y: 0.56 },
      { x: 0.68, y: 0.67 },
      { x: 0.68, y: 0.78 },
    ],
    saws: [{ x: 0.3, y: 0.64, r: 0.105 }],
    bubbles: [],
    puffers: [],
    basket: { x: 0.68, y: 0.875 },
  },
  {
    name: 'Bubble Lift',
    hint: 'Drop into the bubble, puff it across, tap to pop',
    shield: { x: 0.24, y: 0.36 },
    ropes: [{ anchor: { x: 0.24, y: 0.09 } }],
    stars: [
      { x: 0.24, y: 0.52 },
      { x: 0.3, y: 0.28 },
      { x: 0.45, y: 0.22 },
      { x: 0.6, y: 0.24 },
      { x: 0.72, y: 0.58 },
    ],
    saws: [],
    bubbles: [{ x: 0.24, y: 0.66, r: 0.115 }],
    puffers: [{ x: 0.09, y: 0.3, angle: 0 }],
    basket: { x: 0.72, y: 0.875 },
  },
  {
    name: 'Saw Corridor',
    hint: 'Slice both ropes when the gap opens',
    shield: { x: 0.5, y: 0.3 },
    ropes: [
      { anchor: { x: 0.28, y: 0.08 } },
      { anchor: { x: 0.72, y: 0.08 } },
    ],
    stars: [
      { x: 0.5, y: 0.48 },
      { x: 0.5, y: 0.6 },
      { x: 0.5, y: 0.74 },
    ],
    saws: [
      { x: 0.26, y: 0.58, r: 0.095, ampX: 0.1, period: 2.6, phase: 0 },
      { x: 0.74, y: 0.58, r: 0.095, ampX: 0.1, period: 2.6, phase: Math.PI },
    ],
    bubbles: [],
    puffers: [],
    basket: { x: 0.5, y: 0.875 },
  },
  {
    name: 'Final Delivery',
    hint: 'Everything you learned — protect the family',
    shield: { x: 0.48, y: 0.34 },
    ropes: [
      { anchor: { x: 0.48, y: 0.08, ampX: 0.18, period: 3.0 } },
    ],
    stars: [
      { x: 0.3, y: 0.6 },
      { x: 0.3, y: 0.44 },
      { x: 0.45, y: 0.24 },
      { x: 0.62, y: 0.26 },
      { x: 0.78, y: 0.56 },
    ],
    saws: [{ x: 0.5, y: 0.52, r: 0.09, ampX: 0.26, period: 3.2, phase: 0 }],
    bubbles: [{ x: 0.3, y: 0.74, r: 0.115 }],
    puffers: [{ x: 0.09, y: 0.28, angle: 0 }],
    basket: { x: 0.78, y: 0.875 },
  },
];
