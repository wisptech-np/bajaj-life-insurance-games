// GAME_CONFIG — every gameplay tunable for Guardian Archer lives here.

// Device pixel ratio used for crisp retina rendering (capped at 2 to bound
// canvas memory). The Phaser canvas backing store is WIDTH*DPR x HEIGHT*DPR
// while ALL game logic stays in the 480x640 design space via camera zoom,
// so gameplay is bit-identical at every DPR.
export const DPR = Math.min(
  Math.max((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1),
  2
);

export const GAME_CONFIG = {
  // Session
  SESSION_SECONDS: 120,      // hard cap: 2 minutes
  ARROWS_PER_SESSION: 12,    // limited quiver

  // Physics
  GRAVITY_Y: 300,
  SPEED_COEFF: 5.2,          // drag vector -> launch velocity multiplier
  MAX_PULL: 130,             // px, max drag length
  MIN_PULL: 15,              // px, below this the shot is cancelled

  // Aim assist
  TRAJECTORY_HINT_SHOTS: 3,  // full dotted trajectory only for the first N shots

  // Wind (acceleration px/s^2 per level)
  WIND_FORCE_PER_LEVEL: 14,

  // Scoring
  POINTS: { L: 100, M: 150, S: 250 } as Record<'L' | 'M' | 'S', number>,
  CRITICAL_MULTIPLIER: 2,    // direct core hit
  STREAK_BONUS: 25,          // per consecutive hit beyond the first (capped)
  STREAK_BONUS_CAP: 4,       // max stacked streak bonuses
  TIME_BONUS_PER_SECOND: 5,  // added to score on a win

  // Virus body radii (px) and core ratio
  VIRUS_RADIUS: { L: 34, M: 26, S: 18 } as Record<'L' | 'M' | 'S', number>,
  CORE_RATIO: 0.36,          // core radius = body radius * ratio

  // Waves — difficulty ramps: smaller, farther, faster, windier
  WAVES: [
    {
      label: 'Wave 1 — Everyday Risks',
      sizes: ['L', 'L', 'L'] as Array<'L' | 'M' | 'S'>,
      motions: ['static', 'bob', 'static'] as Array<'static' | 'bob' | 'drift'>,
      xRange: [255, 360] as [number, number],
      windMax: 2,
      bobAmp: 14,
      driftAmp: 0,
    },
    {
      label: 'Wave 2 — Health Risks',
      sizes: ['M', 'M', 'M'] as Array<'L' | 'M' | 'S'>,
      motions: ['bob', 'drift', 'bob'] as Array<'static' | 'bob' | 'drift'>,
      xRange: [285, 405] as [number, number],
      windMax: 4,
      bobAmp: 22,
      driftAmp: 26,
    },
    {
      label: 'Wave 3 — Critical Risks',
      sizes: ['S', 'S', 'S', 'M'] as Array<'L' | 'M' | 'S'>,
      motions: ['drift', 'bob', 'drift', 'drift'] as Array<'static' | 'bob' | 'drift'>,
      xRange: [300, 418] as [number, number],
      windMax: 6,
      bobAmp: 28,
      driftAmp: 40,
    },
  ],

  // Risk names surfaced in floating text when a virus pops
  RISK_NAMES: ['Illness Risk', 'Accident Risk', 'Debt Risk', 'Income Risk', 'Medical Risk'],

  // Canvas
  WIDTH: 480,
  HEIGHT: 640,
  GROUND_Y: 560,
  ARCHER_X: 72,
  ARCHER_Y: 518,
};
