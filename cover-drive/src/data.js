// data.js — Cover Drive tunables.
//
// Every number a designer would want to retune lives here. src/deliveries.js and
// src/rules.js are pure functions that take this object as an argument, and
// scripts/balance.mjs runs those same shipped modules headless — so the balance
// table quoted below is measured against the code that ships rather than a
// re-implementation that can silently drift from it.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar on the ground: BLUE is the batter and the protection you own
   (helmet, shield pip, the cover-ball halo), ORANGE is the delivery about to be
   bowled — the marker, the bowler's stripe, the ball's trail — RED is the
   wicket, GOLD is a boundary, and GREEN is progress toward the chase. Green
   therefore always means "you are winning" and never means a hazard. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  skyTop: '#081026',
  skyMid: '#0A1E42',
  standsDeep: '#0A1730',
  stands: '#132B54',
  standsLt: '#1C3E75',

  turfDeep: '#0A3320',
  turf: '#12522F',
  turfLt: '#1B7040',
  turfLine: 'rgba(255,255,255,0.10)',

  pitchDeep: '#8B7748',
  pitch: '#C2A971',
  pitchLt: '#E0CDA0',
  crease: 'rgba(255,255,255,0.82)',

  rope: '#EAF1FA',
  ropePost: '#9FB6D4',

  ball: '#D8302A',
  ballLt: '#FF6E63',
  ballSeam: '#F4E3C8',

  stump: '#EFE0BC',
  stumpDeep: '#B79A62',

  kitLt: '#F3F7FF',
  kit: '#D7E3F5',
  pad: '#F0EBDA',
  padLine: '#C6BC9C',
  skin: '#D9A277',
  bat: '#DDBB80',
  batDeep: '#A67E45',
  batGrip: '#12284A',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   `chase`, `timing`, `deliveries`, `ramp` and `cover` are consumed by the pure
   modules in src/deliveries.js and src/rules.js — the same modules
   scripts/balance.mjs imports, so every number below is exactly what the
   balance gate measured. */
export const GAME_CONFIG = {
  /* Session cap — a SAFETY NET ONLY, not a lose condition anyone can reach.
     scripts/balance.mjs charges every ball its worst case (left alone to the
     late cutoff, then the longest tail an outcome can have, plus a hit-stop) and
     proves the longest possible 18-ball innings finishes well inside this, with
     over twenty seconds to spare. Timeout is therefore unreachable in normal
     play; the two real lose paths are three wickets and balls exhausted, both of
     which live inside the 18 balls. The clock exists so a backgrounded or
     abandoned tab still terminates, and to keep the session under the standard's
     two-minute cap. Raising the ball timings without re-running the gate is what
     would turn it into a hidden second difficulty knob. */
  sessionSeconds: 100,

  /* -- The chase ----------------------------------------------------------
     40 off 18 with 3 wickets in hand. 2.22 runs a ball is a genuine T20 chase
     rate: you cannot nurdle singles to it, you need roughly eight boundaries,
     which is what makes PERFECT timing the thing being asked for. */
  chase: {
    target: 40,
    balls: 18,
    wickets: 3,
  },

  /* -- Timing judgment ----------------------------------------------------
     Windows are half-widths in milliseconds around the ideal contact instant,
     authored for a reference-pace delivery and divided by that delivery's speed
     factor (see deliveries.js `windowScale`). A quicker ball gives you less
     time to be right, which is what makes the three telegraphed paces matter
     for difficulty rather than only for when to tap.

     BALANCE CORRECTION — `windowScale`. The spec's literal windows (36 / 90 /
     150 ms) are unreachably generous against the spec's own σ = 45 ms bot:
     |err| ≤ 36 ms is 0.8σ, so that bot times well over half its balls PERFECT
     and the chase is a formality. One constant scales all three windows
     together, so the authored 36 : 90 : 150 ratio is preserved exactly; only
     the absolute difficulty moves. Measured with the shipped modules
     (`node scripts/balance.mjs --runs 4000 --scale <s>`), seed 0x0c07d21e:

       windowScale    0.45   0.48   0.50   0.52   0.55   0.58   0.62   0.70   1.00
       casual σ=45   18.9%  25.4%  30.9%  36.3%  44.3%  51.4%  62.1%  78.7%  99.3%
       ceiling σ=12   100%   100%   100%   100%   100%   100%   100%   100%   100%

     The brief's band is 25–45%; 1.00 measures 99.3%, which is the proof the
     literal constant is broken rather than merely generous. 0.52 sits mid-band
     with a two-sided margin (the band spans roughly 0.478–0.553), and the skill
     ceiling is untouched at every value — a metronomic bat always wins, so the
     correction costs nothing at the top end. Rationale in
     okf-brain/cover-drive/log.md.

     Effective half-windows after the per-delivery speed divide:
       reference stock ball  PERFECT ±18.7 ms  GOOD ±46.8 ms  EDGE ±78.0 ms
       over-3 Express        PERFECT ±13.6 ms  GOOD ±34.0 ms  EDGE ±56.7 ms
       over-2 slower ball    PERFECT ±27.0 ms  GOOD ±67.6 ms  EDGE ±112.7 ms */
  timing: {
    perfectMs: 36,
    goodMs: 90,
    edgeMs: 150,
    windowScale: 0.52,
    /** An inside edge is 35% of the time onto the stumps. */
    edgeWicketChance: 0.35,
    /** Share of deliveries aimed at the stumps: a swing-and-miss on one is out. */
    stumpLineChance: 0.60,
  },

  /* -- What a shot is worth -----------------------------------------------
     PERFECT alternates 4 then 6 so a purple patch reads as a sequence rather
     than a slot machine; GOOD alternates 1 then 2 for the same reason. */
  runs: {
    boundary: [4, 6],
    good: [1, 2],
  },

  /* -- Deliveries ---------------------------------------------------------
     Three paces, telegraphed before the run-up by the length marker's colour
     and the pace chip. `factor` multiplies ball speed: it shortens the flight
     AND tightens the timing window by the same amount, so "Express" is quicker
     in both senses of the word.

     `lengthFrac` is where the ball pitches, 0 = bowler's end, 1 = the crease.
     It only drives the marker and the bounce, never the judgment. */
  deliveries: {
    /** Release → ideal contact, seconds, at speed factor 1.0. */
    referenceFlightSeconds: 0.62,
    runUpSeconds: 0.78,
    /** Beat between a resolved ball and the next run-up starting. */
    setupSeconds: 0.62,
    /** How long the outcome is held once the ball has come to rest. */
    resolveSeconds: 0.55,
    /** Extra time after the ideal contact instant before a no-shot is judged. */
    lateGraceSeconds: 0.13,
    /* How long the ball takes to travel after the shot, by outcome. These are
       presentation timings, but they are also the difference between an innings
       that fits in `sessionSeconds` and one that does not — so deliveries.js
       exposes ballDurationSeconds() from them and scripts/balance.mjs asserts
       that a full 18-ball innings always fits. Keep them here, not inline in
       the component, so that assertion stays honest. */
    shotSeconds: {
      six: 0.95,
      four: 0.85,
      runs: 0.70,
      edge: 0.62,
      dead: 0.50,
    },
    /* Travel time for a ball carrying on into the stumps. It is shorter the
       later the batter was beaten, because the ball is already most of the way
       down: `base + span x (fraction of the flight still to come)`, floored at
       `min`. Its maximum (base + span, on a swing at the moment of release) is
       what ballDurationSeconds() charges. */
    bowledSeconds: {
      min: 0.16,
      base: 0.14,
      span: 0.45,
    },
    /** Extra beat after a dismissal, so the timber lands before the next run-up. */
    wicketBeatSeconds: 0.50,
    tiers: [
      {
        key: 'loop',
        label: 'Loopy',
        factor: 0.86,
        weight: 0.30,
        lengthFrac: [0.50, 0.66],
        names: [
          'Retirement floater',
          'Pension-gap lob',
          'Lifestyle-creep loop',
        ],
      },
      {
        key: 'stock',
        label: 'Stock',
        factor: 1.00,
        weight: 0.42,
        lengthFrac: [0.62, 0.76],
        names: [
          'EMI good-length ball',
          'School-fee seamer',
          'Rent-hike nip-backer',
          'Tax-season off-cutter',
        ],
      },
      {
        key: 'express',
        label: 'Express',
        factor: 1.18,
        weight: 0.28,
        lengthFrac: [0.44, 0.88],
        names: [
          'Medical emergency yorker',
          'Inflation bouncer',
          'Job-loss yorker',
          'Market-crash bumper',
        ],
      },
    ],
    /** Names used when the slower-ball variation is bowled, whatever the tier. */
    slowerNames: [
      'Premium-holiday slower ball',
      'Deferred-goal slower ball',
      'Lock-in period slower ball',
    ],
  },

  /* -- Difficulty ramp ----------------------------------------------------
     +8% ball speed every over (6 balls), so the over-3 Express delivery is
     1.18 × 1.1664 = 1.376× reference and its PERFECT window is 13.6 ms wide
     either side. From ball 7 the bowler mixes in the slower ball, which is
     0.8× — more air, a wider window, and a wrecked rhythm if you have settled
     into the quick one. */
  ramp: {
    ballsPerOver: 6,
    speedStepPerOver: 1.08,
    slowerBallFactor: 0.8,
    /** 1-based ball number from which the slower ball can appear. */
    slowerBallFromBall: 7,
    slowerBallChance: 0.22,
  },

  /* -- Cover ball ---------------------------------------------------------
     Every 6th ball is marked. Time it PERFECT and you bank a wicket shield:
     the next dismissal is absorbed. Cover is a floor, not a ceiling — it never
     adds a run, it only stops one mistake ending the chase. */
  cover: {
    everyNthBall: 6,
    maxShields: 1,
  },

  fx: {
    wicketShake: 8,
    missShake: 4,
    hitStopSeconds: 0.07,
    contactParticles: 14,
    boundaryParticles: 26,
    sixParticles: 34,
    edgeParticles: 10,
    wicketParticles: 26,
    shieldParticles: 18,
    winParticles: 40,
    ropeSparkParticles: 12,
    bannerSeconds: 1.05,
    batSwingSeconds: 0.34,
    ballSquashSeconds: 0.2,
    trailSampleSeconds: 0.012,
  },

  hud: {
    /** Beat between the innings ending on screen and the results screen. */
    endBeatMs: 700,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle: the chase target itself. */
export const RESULT_TARGET_RUNS = GAME_CONFIG.chase.target;
