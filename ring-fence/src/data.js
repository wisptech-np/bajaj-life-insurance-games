// data.js — Ring-Fence tunables. Every number the rules or the presentation
// reads lives here; src/rules.js receives this object as a parameter and never
// imports it, so gate.mjs can drive the same rules with the same config.
//
// Logical playfield: 390 x 702 px = 65 x 117 cells of 6 px. A 2-cell frame of
// the grid starts claimed — the glowing safety wall the guardian rides.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  blueLt: '#7FC0FF',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  greenLt: '#5CE07E',
  virus: '#49E24B',
  virusDeep: '#0E5C1D',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  bgDark: '#0B1221',
  bgDeep: '#061229',
  wall: '#3B8DD4',
};

export const GAME_CONFIG = {
  // ---- Session ------------------------------------------------------------
  sessionSeconds: 90,
  winPct: 70,                    // claim this % of the open field to win
  lives: 3,
  targetScore: 8000,             // results-screen progress ring only

  // ---- Grid ---------------------------------------------------------------
  grid: {
    cellPx: 6,
    cols: 65,                    // 65 * 6 = 390 logical px wide
    rows: 117,                   // 117 * 6 = 702 logical px tall
    border: 2,                   // frame cells that start claimed (safety wall)
  },

  // ---- Guardian -----------------------------------------------------------
  player: {
    speed: 300,                  // px/s along lanes, riding wall or cutting
    radius: 6,                   // body radius for orb contact mid-cut
    invulnSeconds: 1.2,          // after a respawn
    dirDeadzonePx: 14,           // virtual-stick travel before a direction reads
  },

  // ---- Cutting / anti-stall fuse -------------------------------------------
  cut: {
    fuseIdleSeconds: 0.8,        // stall this long mid-cut and the fuse ignites
    fuseSpeed: 340,              // px/s the fuse chases along the trail
    fuseRelightSeconds: 0.15,    // once lit, a new stall resumes it this fast
  },

  // ---- Hazard orbs ----------------------------------------------------------
  orbs: {
    radius: 13,
    baseSpeed: 250,              // px/s at t = 0
    maxSpeed: 300,               // px/s at t = rampSeconds
    rampSeconds: 90,
    starts: [                    // fractions of field + heading; jittered per run
      { x: 0.34, y: 0.30, angleDeg: 37 },
      { x: 0.66, y: 0.70, angleDeg: 214 },
    ],
    startAngleJitterDeg: 24,
    startPosJitterPx: 30,
    third: {
      pctTrigger: 65,            // % claimed that summons the third orb…
      timeTrigger: 55,           // …or this many seconds, whichever first
      minPlayerDist: 150,        // spawn at least this far from the guardian
      warningSeconds: 1.5,       // visible warning ring before it goes live
    },
    camping: {                   // boundary-camping pressure
      intervalSeconds: 8,        // every 8 s without a claim…
      bonusPerInterval: 0.06,    // …orbs gain +6% speed…
      maxBonus: 0.30,            // …capped at +30%; any claim resets it
    },
    nearMissPx: 20,              // orb this close to a live trail = near miss
  },

  // ---- Scoring --------------------------------------------------------------
  scoring: {
    perCell: 1,
    multipliers: [               // single-seal area as % of the open field
      { pct: 30, mult: 4 },
      { pct: 20, mult: 2.5 },
      { pct: 10, mult: 1.5 },
    ],
    timeBonusPerSecond: 20,      // on a win
    lifeBonus: 250,              // per shield left, on a win
    nearMiss: 40,
  },

  // ---- Presentation ---------------------------------------------------------
  fx: {
    wavePxPerSecond: 900,        // the claim flood-fill wave
    waveCrestParticles: 3,       // per frontier sample per frame
    slowMoSeconds: 0.22,         // big-cut slow-mo (real time)
    slowMoScale: 0.3,            // sim speed during the slow-mo
    bigCutPct: 10,               // seals at/above this % get the full ceremony
    burnSeconds: 0.15,           // trail burn-back after a hit
    bannerSeconds: 1.6,
    sealParticles: 14,
    hitParticles: 18,
    winParticles: 26,
    loseParticles: 20,
    endBeatMs: 950,              // beat between the final frame and the results
    trailSampleEvery: 6,         // trail cells per tension-pulse distance sample
  },

  // ---- HUD / anti-pause-scum -------------------------------------------------
  hud: {
    lowTimeSeconds: 10,
    // Resuming from the kit's visibility auto-pause costs a frozen, input-dead
    // 3-2-1 count (clock held), then a short live input lock. >= 1.2 s total.
    reacquireFreezeSeconds: 1.8,
    reacquireLockSeconds: 0.25,
  },
};
