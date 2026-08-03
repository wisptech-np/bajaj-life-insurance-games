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

// ---- Art direction ---------------------------------------------------------
// Ring-Fence is drawn as a surveyor's plot on a backlit drafting table (see
// asset-from-here.md): hard draughting linework, measured graph rule, 45°
// ownership hatching, dimension ticks, dashed provisional construction lines.
// Restraint is the point — structure carries the premium read, not bloom.
// Every colour and constant the canvas or the HUD paints with lives here.
export const ART = {
  // The sheet the field is drawn on.
  sheet: {
    top: '#0A1930',
    base: '#050E1F',
    bottom: '#04091A',
    minor: 'rgba(127,192,255,0.045)',   // 2-cell graph rule
    major: 'rgba(127,192,255,0.10)',    // every fifth rule, so it reads measured
    minorEvery: 2,                      // in cells
    majorEvery: 10,
    lightbox: 'rgba(28,84,178,0.17)',   // uneven glow from the light box beneath
    vignette: 'rgba(2,5,12,0.55)',
    reg: 'rgba(127,192,255,0.22)',      // corner registration crosses
    regInset: 30,
  },

  // Claimed ground — an ownership wash under a 45° hatch.
  claim: {
    wash: '#0D2A5C',
    washFresh: '#1D57B4',               // what the colour wave lays down first
    hatch: 'rgba(140,195,255,0.11)',
    hatchPx: 11,                        // hatch tile edge, logical px
    sheenTop: 'rgba(46,120,224,0.34)',
    sheenMid: 'rgba(0,61,166,0.14)',
    sheenBottom: 'rgba(7,17,42,0.52)',
  },

  // The surveyed boundary the guardian rides.
  wall: {
    band: 'rgba(44,112,182,0.5)',
    line: '#7FC0FF',
    lineW: 1.5,
    glow: 5,                            // px; 0 disables on low tier
    tick: 'rgba(127,192,255,0.42)',
    tickEvery: 8,                       // cells between dimension ticks
    tickLen: 3.5,
    breathe: 0.07,                      // boundary breathes ±7%, not ±35%
  },

  // The unfinished cut: provisional, therefore dashed.
  cut: { dash: [10, 6], travel: 46, width: 3.2, core: 1.2 },

  // The guardian station marker.
  player: { scale: 9, seat: 'rgba(4,10,24,0.72)', tickLen: 0.55 },

  // HUD type scale (px). One hero, two peers, everything else subordinate.
  // hero/value shrink on short handsets; fit() publishes them as CSS vars so a
  // resize never has to round-trip through React.
  type: {
    label: 9, caption: 8.5, bannerTitle: 18, bannerSub: 9.5, hint: 11,
    value: 20, hero: 30,
    valueSmall: 17, heroSmall: 25,
  },

  // HUD chrome band above the field. Must clear hero + caption + rail row.
  hud: { band: 70, bandSmall: 64, compactUnder: 620, rail: 3 },

  // The screen furniture (home / how-to / results) sits on the same sheet as
  // the field, at half weight — material, not wallpaper.
  screen: { minor: 'rgba(127,192,255,0.028)', major: 'rgba(127,192,255,0.055)' },
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
