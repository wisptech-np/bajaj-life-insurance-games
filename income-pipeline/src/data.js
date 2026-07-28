// data.js — Income Pipeline tunables.
//
// Every number a designer would want to retune lives here. The pure rule
// modules (src/flow.js, src/levels.js) and the canvas component read from this
// file and never hard-code gameplay values; the only constants in the component
// are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for the board: GOLD is money in motion (the flow inside the
   pipe, the Retirement tank), BLUE is the plumbing you own (dry pipe metal, the
   Education / Home tanks), ORANGE is the player's own hand (the tile under the
   finger, the payday clock) and RED is loss (an open pipe end spraying income
   onto the floor). GREEN is reserved for a tank that is full, so green always
   means "a goal is funded". */
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
  boardTop: '#0A1E42',
  boardMid: '#0B2450',
  boardLow: '#061229',

  // Grid furniture.
  wellFill: 'rgba(255,255,255,0.035)',
  wellLine: 'rgba(255,255,255,0.075)',
  boardEdge: 'rgba(255,255,255,0.14)',

  // Pipe rendering: a dark casing, a cool metal bore, a warm bore when money
  // is inside it.
  pipeCasing: '#0D1A33',
  pipeMetal: '#4E7FB8',
  pipeMetalLt: '#8FB8E8',
  // A tile already joined to the salary tap: warm, but not yet money.
  pipePrimed: '#C9922B',
  pipePrimedLt: '#F0C878',
  pipeLocked: '#7C6BD8',
  pipeLockedLt: '#BFB4FF',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   `levels`, `scoring` and `bot` are consumed by the pure modules, which are
   what scripts/balance.mjs imports — so every number below is exactly what the
   balance table measured. */
export const GAME_CONFIG = {
  /** Hard session cap. The three payday timers total 66 s, so a full-length
      run with all three flow animations lands around 78 s. */
  sessionSeconds: 120,

  /* -- Tank identities, in the order levels unlock them --------------------
     Level 1 routes to Education alone (the teaching level), level 2 adds Home,
     level 3 adds Retirement. */
  tankTypes: [
    { key: 'edu', label: 'EDU', full: 'Education', color: '#3B8DD4', colorLt: '#9FD0FF' },
    { key: 'home', label: 'HOME', full: 'Home', color: '#1E6BE0', colorLt: '#7FB6FF' },
    { key: 'ret', label: 'RET', full: 'Retirement', color: '#FFC845', colorLt: '#FFE38A' },
  ],

  /* -- The three levels ---------------------------------------------------
     `scramble` is the band the generator aims the scramble distance at — the
     number of taps that returns the board to the layout it was built from.
     `par` is the band the EXACT optimal solver (flow.js minRotationsToSolve,
     a Dijkstra over per-cell rotation states) must land in, and it is what the
     balance gate asserts:

       par >= parMin  the scramble is genuinely unsolved and worth playing
                      (the brief's ">= 4 rotations from solution", strengthened
                      from "from the generated solution" to "from ANY solution")
       par <= parMax  the brief's "par <= 14 rotations per level"

     scramble bands ramp so the difficulty curve is real rather than incidental,
     and they sit under parMax with headroom because par <= scrambleDistance
     always (the generated layout is one witness among possibly cheaper ones). */
  levels: [
    { id: 1, cols: 4, rows: 4, tanks: 1, timerSeconds: 18, scramble: [4, 7], parMin: 4, parMax: 14 },
    { id: 2, cols: 5, rows: 5, tanks: 2, timerSeconds: 22, scramble: [5, 9], parMin: 4, parMax: 14 },
    { id: 3, cols: 6, rows: 6, tanks: 3, timerSeconds: 26, scramble: [7, 11], parMin: 4, parMax: 14 },
  ],

  /* -- Generation knobs ---------------------------------------------------
     Decoy tiles fill every cell the solution tree does not use. They are the
     reason a level is a puzzle rather than a maze trace: a decoy that the flow
     wanders into sprays income out of its spare ends, so the tidy route is
     worth more than the first route.

     `cross` decoys are deliberately in the pool even though a cross cannot be
     rotated — a cross is only ever a hazard if the player opens a pipe into it,
     which is a choice, never an ambush. */
  generation: {
    decoyWeights: { straight: 0.34, elbow: 0.34, tee: 0.22, cross: 0.10 },
    // Bias applied when carving the solution path: probability that the step
    // toward the target is tried first. 1.0 gives ruler-straight pipes, 0.0
    // gives spaghetti that eats the whole grid.
    carryOnBias: 0.62,
    // Safety valves. Generation is rejection-sampled; these bound the work.
    scrambleAttempts: 260,
    layoutAttempts: 40,
  },

  /* -- Scoring ------------------------------------------------------------
     A tank reached is +150, an open pipe end on the live flow path is -25, and
     connecting every tank before the payday clock banks the remaining whole
     seconds at 5 each. Six tanks across three levels = 900 of clean routing,
     which is what the Results ring treats as a full circle. */
  scoring: {
    tankFilled: 150,
    leakPenalty: 25,
    earlyBonusPerSecond: 5,
  },

  /* -- Flow animation -----------------------------------------------------
     Money advances one BFS ring per `cellSeconds`, so the wavefront reads as
     water finding its way rather than as a list being ticked off. */
  flow: {
    cellSeconds: 0.1,
    // Beat held after the last cell fills, before the level is scored.
    settleSeconds: 0.55,
    // Time a tank takes to visibly fill once the flow reaches it.
    tankFillSeconds: 0.45,
    // Beat between a level being scored and the next board appearing.
    levelBeatSeconds: 1.15,
  },

  /* -- Balance model ------------------------------------------------------
     The headless gate in scripts/balance.mjs drives the SHIPPED rule modules
     with these two bots. `secondsPerRotation` is the brief's 0.9 s: a rotation
     budget per level of floor(timerSeconds / 0.9) = 20 / 24 / 28 taps.

     MEASURED (node scripts/balance.mjs --runs 300, seed 0x1e0c0de):
       greedy bot   all three levels within their timers on  78.7% of 300 seeds
                    (per level: L1 99.7%, L2 95.7%, L3 80.0%)
       random bot   all three levels within their timers on   0.0% of 300 seeds
     Stable across seed streams: 75.0 / 76.3 / 76.0% at seeds 1 / 999 / 424242,
     and 77.1% over 1500 runs. Par across those 900 generated levels: min 4,
     max 11, mean 7.1 — inside the brief's <= 14 with room, never already
     solved, and never further from a solution than the clock can pay for.

     The greedy bot is a genuinely myopic hill-climber: it evaluates every
     single-tile rotation, takes the best gain per tap, and when no single
     rotation improves the board it is stuck in a local optimum and burns a tap
     on a random tile to break out. Those wasted taps are the whole distribution
     — a perfect solver would win 100% of seeds at par <= 11 against a 20-tap
     budget, which is why the brief asks for a greedy bot and not an optimal one. */
  bot: {
    secondsPerRotation: 0.9,
    // Greedy board-evaluation weights. Tank connection dominates; the distance
    // term is the gradient that makes hill-climbing converge; growth and leak
    // terms only break ties between equally-close routes.
    weights: { tank: 1e6, distance: 2000, reached: 60, leak: 15 },
    // Steps a tile stays off-limits after an escape tap touched it.
    tabuSteps: 4,
    // Consecutive local-optimum escapes before the bot is declared hopeless.
    stuckLimit: 40,
  },

  fx: {
    tapParticles: 8,
    fillParticles: 9,
    leakParticles: 14,
    tankParticles: 22,
    winParticles: 40,
    loseParticles: 22,
    leakShake: 4,
    loseShake: 8,
    hitStopSeconds: 0.05,
    // Seconds a tile takes to swing through its 90 degrees.
    rotateSeconds: 0.16,
    // Seconds a tile stays highlighted after a tap.
    tapGlowSeconds: 0.3,
    bannerSeconds: 1.4,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 700,
    lowTimeSeconds: 6,
    lowSessionSeconds: 20,
  },
};

/** Every tank across the three levels: the denominator of a perfect run. */
export const TOTAL_TANKS = GAME_CONFIG.levels.reduce((sum, l) => sum + l.tanks, 0);

/** Score the Results ring treats as a full circle: every tank, zero leaks. */
export const RESULT_TARGET_SCORE = TOTAL_TANKS * GAME_CONFIG.scoring.tankFilled;
