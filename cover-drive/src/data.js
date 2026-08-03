// data.js — Cover Drive tunables.
//
// Every number a designer would want to retune lives here. src/physics.js,
// src/deliveries.js and src/rules.js are pure functions that take this object
// as an argument, and scripts/balance.mjs runs those same shipped modules
// headless — so every balance figure quoted below is measured against the code
// that ships rather than a re-implementation that can silently drift from it.
//
// Physics/feel constants shared across every game in the repo (fixed step,
// input buffer, particle budgets, haptics) come from the kit: src/kit/config.js
// BALANCE. Nothing in src/kit/ is edited by this game.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar on the ground: BLUE is the batter and the protection you own
   (helmet, shield pip, the Protection Cover wedge), ORANGE is the delivery
   about to be bowled — the length marker, the bowler's stripe, the ball's trail
   — RED is the wicket, GOLD is a boundary, and GREEN is progress toward the
   chase. Green therefore always means "you are winning" and never means a
   hazard. The four scoring zones carry their own accents, listed with them. */
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
  cyan: '#00A3E0',
  cyanLt: '#68D6FF',
  violet: '#A78BFA',

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

/* ─── Insurance scoring zones ─────────────────────────────
   The field is divided into four wedges, and the player picks one with the
   horizontal position of the swing tap. This is the "shot selection is a
   financial choice" requirement, and it is a real choice because the zones do
   not merely pay different amounts — they have different SHAPES of payout:

     Guaranteed Income  pays something even off an edge and can never get you
                        out. It is the floor. It also cannot win a tight chase.
     Education Drive    the workhorse: a good return for a good shot, a small
                        risk of holing out, nothing off the edge.
     Protection Cover   pays less than the others but a middled one banks a
                        WICKET SHIELD, which absorbs the next dismissal. It buys
                        survival rather than runs.
     Retirement Corner  the only zone that pays six, and the only one where a
                        merely-good shot is caught better than a third of the
                        time. Growth with volatility.

   So the required rate is what drives shot selection: 12 needed off 4 forces
   Retirement Corner and its catch risk, while 3 needed off 5 makes Guaranteed
   Income obviously correct. scripts/balance.mjs plays a bot that picks on
   exactly that basis and reports the zone mix it ends up with.

   `bearingDeg` is the direction the ball leaves the bat, 90 = straight down the
   ground, 180 = square on the off side, 0 = square on the leg side. `carry` is
   how far toward the rope it travels, 1.0 = the rope itself. Lanes read left to
   right across the canvas in array order, and the bearings decrease in the same
   order, so the wedge a player taps under is the wedge the ball flies into. */
export const ZONES = [
  {
    key: 'education',
    label: "Child's Education",
    short: 'Education',
    note: 'Through the covers',
    color: '#00A3E0',
    colorLt: '#68D6FF',
    bearingDeg: 148,
    carry: 1.0,
    aerial: false,
    /** Runs by shot band. An edge into this zone finds a fielder. */
    runs: { perfect: 4, good: 3, edge: 0 },
    /** Chance the shot is caught, by band. */
    catch: { perfect: 0, good: 0.14, edge: 0 },
    grantsShield: false,
    blurb: 'Fund the degree. Solid return, small risk.',
  },
  {
    key: 'protection',
    label: 'Protection Cover',
    short: 'Protection',
    note: 'Straight past the bowler',
    color: '#1E6BE0',
    colorLt: '#A6D0FF',
    bearingDeg: 96,
    carry: 1.0,
    aerial: false,
    runs: { perfect: 4, good: 1, edge: 0 },
    catch: { perfect: 0, good: 0.10, edge: 0 },
    /** A middled Protection Cover banks a wicket shield. */
    grantsShield: true,
    blurb: 'Fewer runs, but a middled one banks a shield.',
  },
  {
    key: 'retirement',
    label: 'Retirement Corner',
    short: 'Retirement',
    note: 'Over deep midwicket',
    color: '#FFC845',
    colorLt: '#FFE38A',
    bearingDeg: 46,
    carry: 1.06,
    aerial: true,
    runs: { perfect: 6, good: 3, edge: 0 },
    catch: { perfect: 0, good: 0.36, edge: 0 },
    grantsShield: false,
    blurb: 'The only six on the field. Mistime it and you are caught.',
  },
  {
    key: 'income',
    label: 'Guaranteed Income',
    short: 'Income',
    note: 'Nudged square, along the ground',
    color: '#28A745',
    colorLt: '#4ADE80',
    bearingDeg: 13,
    carry: 0.46,
    aerial: false,
    /* Deliberately flat: 2 whether you middle it or not, and 1 off an edge.
       It is the only zone that pays on a bad shot and the only one that cannot
       get you caught — but 2 a ball off 18 is 36, and the target is above that,
       so a whole innings of Guaranteed Income loses the chase by design. That
       is the choice the zone exists to force. */
    runs: { perfect: 2, good: 2, edge: 1 },
    catch: { perfect: 0, good: 0, edge: 0 },
    grantsShield: false,
    blurb: 'Always banks something. Never gets you caught. Never wins alone.',
  },
];

/* ─── Gameplay configuration ──────────────────────────────
   `pitch`, `chase`, `deliveries`, `ramp` and `zones` are consumed by the pure
   modules in src/physics.js, src/deliveries.js and src/rules.js — the same
   modules scripts/balance.mjs imports, so every number below is exactly what
   the balance gate measured. */
export const GAME_CONFIG = {
  /* Session cap — a SAFETY NET ONLY, not a lose condition anyone can reach.
     scripts/balance.mjs charges every ball its worst case and proves the
     longest possible 18-ball innings finishes inside this with room to spare.
     The clock exists so a backgrounded or abandoned tab still terminates, and
     to keep the session under the standard's two-minute cap. */
  sessionSeconds: 110,

  /* -- The chase ----------------------------------------------------------
     Off 18 balls with 3 wickets in hand. The target is set so that Guaranteed
     Income alone cannot get you there — you have to visit the risky zones at
     some point, which is the entire point of the zone design. */
  chase: {
    target: 48,
    balls: 18,
    wickets: 3,
  },

  zones: ZONES,

  /* -- The pitch, in metres -----------------------------------------------
     src/physics.js works entirely in these units and the renderer projects
     them; the collision therefore happens in the same space the player is
     looking at, which is what the previous build did not do. */
  pitch: {
    /** Release point, metres down the pitch from the batter's stumps. */
    releaseY: 17.2,
    /** Nominal contact plane. `flightSeconds` is release to here. */
    contactY: 1.02,
    /** Behind this the ball has beaten the bat; you cannot reach back for it. */
    minContactY: 0.10,
    /** Half the width of the pitch strip (a pitch is 3.05 m wide). */
    halfWidthM: 1.525,
    /** Wide of this and the delivery is a wide, never bowled at. */
    maxLineM: 0.74,
    /** Inside this of the middle stump and a miss is bowled. */
    stumpHalfM: 0.15,
    ballRadius: 0.036,
    releaseH: 1.98,
    maxBounceH: 1.34,
    /** Length that produces a full-height bounce; shorter climbs, fuller skids. */
    bounceRefLength: 0.60,

    /* -- The batter ------------------------------------------------------
       BATTER PLACEMENT. The old build pinned the batter to a fixed fraction
       of the pitch width whatever the delivery did, so on a wide ball the bat
       was never within reach of the line. A real batter moves to the line, so
       the hands track it `footworkFrac` of the way and the body stands
       `standOffsetM` to the leg side of the hands. What is left over —
       `pivotOffsetM` minus the untracked part of the line — is the
       perpendicular distance from the hands to the ball's path, and THAT is
       what sets the timing windows. A ball angled away from the body is played
       nearer the hands and is measurably harder; one coming into the pads is
       easier. The length marker telegraphs the line before the run-up, so it is
       difficulty the player is told about in advance.

       The blade runs from `bladeInner` to `bladeOuter` metres out from the
       hands, with the middle of the bat at `sweetRadius`. Every timing band is
       a distance from that sweet spot, in metres of blade — never a stopwatch
       reading. scripts/balance.mjs converts them back to seconds by bisecting
       the shipped collision and reports both. */
    batter: {
      pivotOffsetM: 0.50,
      footworkFrac: 0.88,
      pivotY: 0.36,
      standOffsetM: 0.22,

      bladeInner: 0.34,
      bladeOuter: 0.98,
      sweetRadius: 0.78,
      halfThicknessM: 0.056,
      bladeLowH: 0.0,
      /** Generous on purpose: the batter adjusts height, the player times. */
      bladeHighH: 1.55,

      /* Middle of the bat. Slightly wider than it looks: the swept scan
         reports the FIRST instant the ball's surface touches the blade, which
         is up to a ball-radius before its centre arrives, so a contact the
         closed-form idealContact() places exactly on the sweet spot measures a
         few millimetres off it. scripts/balance.mjs prints the worst such
         residual across the whole delivery space and gates on it. */
      perfectTolM: 0.125,
      /** Still off the meat of the blade, but under control. */
      goodTolM: 0.26,
      /** Used only to normalise the 0..1 quality readout for the renderer. */
      edgeTolM: 0.42,

      /** The downswing: a constant angular rate through this arc. */
      swingSeconds: 0.30,
      swingArcRad: 2.0595, // 118 degrees
      /* Blade bearing at the moment of the tap. Chosen so the sweet spot
         reaches the ball's line at roughly half the swing on a stock delivery,
         which leaves symmetric room either side for an early or a late tap. */
      thetaStart: 3.30,

      /** Swept-collision resolution. 256 sub-steps is 1.17 ms of swing each. */
      contactSubsteps: 256,
      refineSteps: 22,
      /** How far either side of the ideal tap connectWindow() searches. */
      windowSearchSeconds: 0.60,
    },
  },

  /* -- Deliveries ---------------------------------------------------------
     Three paces, telegraphed before the run-up by the length marker's colour
     and the pace chip. `factor` multiplies ball speed, which shortens the
     flight. It is NOT applied to a timing window anywhere — the windows fall
     out of the collision, and a quicker ball narrows them on its own because it
     crosses the blade's reach sooner. */
  deliveries: {
    /** Release → the nominal contact plane, seconds, at speed factor 1.0. */
    referenceFlightSeconds: 0.80,
    runUpSeconds: 0.80,
    /** Beat between a resolved ball and the next run-up starting. */
    setupSeconds: 0.62,
    /** How long the outcome is held once the ball has come to rest. */
    resolveSeconds: 0.52,
    /** Extra time after the ball passes the bat before a no-shot is judged. */
    lateGraceSeconds: 0.24,
    /* How long the ball takes to travel after the shot, by outcome. These are
       presentation timings, but they are also the difference between an innings
       that fits in `sessionSeconds` and one that does not — so deliveries.js
       exposes ballDurationSeconds() from them and scripts/balance.mjs asserts
       that a full 18-ball innings always fits. */
    shotSeconds: {
      six: 0.95,
      four: 0.85,
      runs: 0.66,
      edge: 0.60,
      dead: 0.48,
    },
    /* Travel time for a ball carrying on into the stumps, shorter the later the
       batter was beaten because the ball is already most of the way down. */
    bowledSeconds: {
      min: 0.16,
      base: 0.14,
      span: 0.42,
    },
    /** Extra beat after a dismissal, so the timber lands before the next run-up. */
    wicketBeatSeconds: 0.48,
    tiers: [
      {
        key: 'loop',
        label: 'Loopy',
        factor: 0.88,
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
        lengthFrac: [0.60, 0.76],
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
        factor: 1.14,
        weight: 0.28,
        lengthFrac: [0.46, 0.86],
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
     +6% ball speed every over (6 balls). The over-3 Express delivery is
     1.14 × 1.1236 = 1.281× reference. From ball 7 the bowler mixes in the
     slower ball at 0.82× — more air, a wider window, and a wrecked rhythm if
     you have settled into the quick one. */
  ramp: {
    ballsPerOver: 6,
    speedStepPerOver: 1.06,
    slowerBallFactor: 0.82,
    /** 1-based ball number from which the slower ball can appear. */
    slowerBallFromBall: 7,
    slowerBallChance: 0.22,
  },

  /* -- Wickets ------------------------------------------------------------ */
  risk: {
    /** An inside edge carries to the keeper this often. */
    edgeWicketChance: 0.30,
    /** Share of deliveries aimed at the stumps: a miss on one is bowled. */
    stumpLineChance: 0.58,
  },

  cover: {
    /** Shields you can hold at once, from middled Protection Cover shots. */
    maxShields: 2,
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
    ballSquashSeconds: 0.2,
    trailSampleSeconds: 0.012,
    /** How long the follow-through takes to settle back into the stance. */
    followThroughSeconds: 0.34,
  },

  hud: {
    /** Beat between the innings ending on screen and the results screen. */
    endBeatMs: 700,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle: the chase target itself. */
export const RESULT_TARGET_RUNS = GAME_CONFIG.chase.target;
