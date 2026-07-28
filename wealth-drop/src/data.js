// data.js — Wealth Drop tunables.
//
// Every number a designer would want to retune lives here. WealthDropGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for the board: RED is risk (the two x0 buckets, the only
   things on screen that can take your money), BLUE is protection (the pegs you
   want to graze, the cover pegs, the coin's shield aura), GOLD is wealth (the
   premium coin, the Retirement buckets) and ORANGE is the player's own hand —
   the aim rail and the drop marker. Green is reserved for progress toward the
   target, so "green" always means "you are winning" and never means a hazard. */
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
  rail: 'rgba(255,255,255,0.10)',
  railTrack: 'rgba(255,255,255,0.14)',

  peg: '#6E9DD6',
  pegCore: '#DCEBFF',
  pegDeep: '#2B558A',
  pegGlow: 'rgba(146,190,255,0.6)',
  cover: '#1E6BE0',
  coverLt: '#A6D0FF',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   `board`, `physics` and `shieldPegs` are consumed by the pure board/physics
   helpers in WealthDropGame.jsx — the same helpers tools/balance-sim.mjs runs
   headless, so every number below is exactly what the balance table measured. */
export const GAME_CONFIG = {
  sessionSeconds: 90,
  coinsPerSession: 10,
  /** Face value of one premium coin. Payout = coinValue x bucket multiplier. */
  coinValue: 100,

  /* -- Bucket ladder, left to right --------------------------------------
     x5 Retirement is pinned to the two outer edges, a x0 Market Risk band sits
     between it and the safe middle, and Home x3 — the goal most families are
     actually funding — is the single centre pocket. Reaching for the biggest
     multiplier means aiming across the volatility band, and the fallback when
     the swing does not land is a modest Savings x1. That is the whole financial
     hook, laid out as geometry.

     BALANCE: the arrangement is not decorative. Measured expected payout per
     coin by aim lane (see README "Balance notes"):

       aim lane   0    1    2    3    4    5    6    7    8
       [5 3 0 2 1 2 0 3 5]  295 262 188 159 148 153 191 263 296   edge 2.00x centre
       [5 1 0 2 3 2 0 1 5]  219 198 163 178 191 174 165 198 221   edge 1.16x centre  <-- shipped
       [5 3 0 1 2 1 0 3 5]  290 255 174 139 133 135 177 254 292   edge 2.19x centre

     The obvious "big prize outside, small prize inside" ladder makes hugging a
     wall twice as good as anything else, which is a solved board. This one has
     a 1.16x spread between the best and the middle and its worst aim is the
     Risk lane itself, so where you release still matters and no single spot
     wins the game for you.

     board.laneCount MUST equal buckets.length. */
  buckets: [
    { key: 'retire', label: 'Retire', full: 'Retirement', mult: 5, kind: 'goal', color: '#FFC845', colorLt: '#FFE38A' },
    { key: 'save', label: 'Save', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
    { key: 'risk', label: 'Risk', full: 'Market Risk', mult: 0, kind: 'risk', color: '#EF4444', colorLt: '#FF8B8B' },
    { key: 'edu', label: 'Educ', full: 'Education', mult: 2, kind: 'goal', color: '#3B8DD4', colorLt: '#9FD0FF' },
    { key: 'home', label: 'Home', full: 'Home', mult: 3, kind: 'goal', color: '#1E6BE0', colorLt: '#7FB6FF' },
    { key: 'edu', label: 'Educ', full: 'Education', mult: 2, kind: 'goal', color: '#3B8DD4', colorLt: '#9FD0FF' },
    { key: 'risk', label: 'Risk', full: 'Market Risk', mult: 0, kind: 'risk', color: '#EF4444', colorLt: '#FF8B8B' },
    { key: 'save', label: 'Save', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
    { key: 'retire', label: 'Retire', full: 'Retirement', mult: 5, kind: 'goal', color: '#FFC845', colorLt: '#FFE38A' },
  ],

  /* -- Board geometry -----------------------------------------------------
     Everything is derived from the measured canvas, so the board is the same
     board on a 360 px phone and a 430 px one: lane pitch scales with width and
     the peg field stretches to whatever height is left between the aim rail and
     the bucket mouths. Radii are fractions of the lane pitch for the same
     reason — a fixed px coin radius would be a different game on each device. */
  board: {
    laneCount: 9,
    // Even rows carry pegs on the lane centres, odd rows on the lane
    // boundaries. An even count therefore ends on a boundary row, which is what
    // funnels a coin into the middle of a bucket instead of onto its divider.
    pegRows: 10,
    sideMarginFrac: 0.028,
    dropYFrac: 0.075,
    pegTopFrac: 0.19,
    bucketHFrac: 0.115,
    bucketHPx: [50, 76],
    bottomMarginPx: 6,
    // Clear air between the last peg row and the bucket mouths, x pitch.
    pegGapBelowFrac: 0.5,
    coinRadiusFrac: 0.175,
    pegRadiusFrac: 0.1,
    // Row spacing floor on very short screens, x pitch.
    minRowGapFrac: 0.5,
  },

  /* -- Coin physics -------------------------------------------------------
     Circle-vs-circle against every peg, with restitution and a jittered contact
     normal. The jitter is what stops the board being a solved puzzle: two coins
     dropped on the same pixel take visibly different paths, which is the point
     of a volatility game. */
  physics: {
    gravity: 2300,
    // Capped so one fixed step (1/120 s) can never move the coin further than
    // the coin+peg collision radius (8.8 px vs 11.8 px on a 407 px canvas) —
    // no tunnelling through the peg field.
    terminalVelocity: 1050,
    // Second, size-relative ceiling on the same thing: no step may cover more
    // than this fraction of the coin+peg collision radius. On a 320 px handset
    // the pitch (and with it the collision radius) shrinks below what the fixed
    // 1050 px/s cap assumes, and the coin could pass straight through a peg.
    maxStepFraction: 0.75,
    restitution: 0.46,
    wallRestitution: 0.42,
    // Tangential velocity kept after a peg hit. Below 1 the coin sheds sideways
    // speed on every contact, so it drifts rather than pinballs off the walls.
    // Measured: 0.90 let lateral speed compound across ten rows and pushed 15%
    // of coins into the outermost pockets; 0.78 keeps the walk local.
    tangentFriction: 0.78,
    // Sideways damping (per second) and a hard sideways cap. These are the two
    // knobs that decide whether the board is plinko or a lottery. Without them
    // the landing distribution measured flat — every pocket ~11% from a dead
    // centre drop, i.e. the aim rail did nothing. At 6 / 230 the landing lane
    // is a bell of sigma ~1.4 lanes around the release point.
    lateralDrag: 6,
    maxLateralSpeed: 230,
    // Contact-normal jitter, radians. This is the "slight randomness".
    normalJitter: 0.13,
    // A coin that lands dead-centre on a peg has no sideways component to
    // reflect and would balance there. Any hit slower than this sideways gets a
    // coin-flip kick, which is also how a real pachinko nail behaves.
    apexNudge: 26,
    dropVy: 60,
    dropVxJitter: 12,
    // Lambda for x -> bucket centre once the coin is inside a pocket.
    settleDamp: 14,
    // Watchdog: a coin that has been falling this long is resolved where it
    // stands. Guarantees the run can always end (and that the headless sim
    // can never hang).
    maxFallSeconds: 12,
  },

  /* -- Cover pegs ---------------------------------------------------------
     One blue cover peg is armed per slot at the start of a run; the column is
     picked once from that slot's candidate list. Touching one shields the coin
     for the rest of its drop, and a shielded coin is paid x1 by a Risk bucket
     instead of x0 — insurance does not raise the ceiling, it lifts the floor.

     The candidate columns fan outward as the rows descend, because that is
     where a coin that has drifted wide actually travels. Cover is placed on the
     path of the coins that need it. */
  shieldPegs: {
    slots: [
      { row: 2, cols: [3, 5] },
      { row: 4, cols: [2, 6] },
      { row: 6, cols: [2, 3] },
      { row: 6, cols: [5, 6] },
      { row: 8, cols: [1, 2] },
      { row: 8, cols: [6, 7] },
    ],
    // A cover peg is spent for the rest of the drop once touched, and re-arms
    // for the next coin. Without this a single peg could shield nothing extra
    // but would still keep flashing as the coin rattled past it twice.
    riskPayoutMultiplier: 1,
  },

  /* -- Combo --------------------------------------------------------------
     Consecutive coins that land in ANY paying bucket (including a Risk bucket
     rescued by cover) extend the streak. The bonus is part of the payout, so
     "score = total payout" stays literally true. */
  combo: {
    bonusPerStep: 20,
    maxSteps: 4,
  },

  /* -- Scoring / win line -------------------------------------------------
     BALANCE (measured — run `node tools/balance-sim.mjs --runs 20000 --sweep`,
     which executes the shipping physics, not a re-implementation):

     20,000 runs per profile, seed 0x5eed1234, 407x612 canvas:

       profile                     mean   p25    p50    p75   win% @ 2500
       centre (exact middle tap)   2399  2100   2420   2700     44.4%
       casual (middle three lanes) 2347  2020   2340   2700     40.2%
       spread (anywhere on rail)   2426  2040   2420   2800     45.8%

       per-coin pocket share, centre drop: Retire x5 1.9% | Save x1 7.0%
         | Risk x0 19.5% | Educ x2 42.2% | Home x3 29.4%
       Of the 19.5% Risk landings 46.1% are rescued by cover, so 10.5% of all
       coins actually pay nothing. Cover picked up on 41-50% of drops; 0.9-1.4
       cover saves per run; best streak averages 7.4 of 10.

       Re-measured at 407x556 and 338x452 the casual win rate is 41.1% and
       36.1%, so the win line holds across the 360x640 / 375x812 / 414x896
       handsets the mobile checklist asks for.

     2500 is the ~40% line the brief asks for and sits just above the mean, so a
     losing run reads as "one bad bounce short" rather than hopeless. A run
     spends ~22-26 s of the 90 s cap watching coins fall, which leaves the
     player about 6 s per drop to aim. See README.md "Balance notes". */
  scoring: {
    targetScore: 2500,
  },

  fx: {
    riskShake: 7,
    hitStopSeconds: 0.07,
    dropParticles: 8,
    pegParticles: 5,
    coverParticles: 16,
    payoutParticles: 20,
    jackpotParticles: 30,
    riskParticles: 20,
    winParticles: 40,
    bannerSeconds: 1.4,
    // Seconds a bucket stays lit / popped after a coin lands in it.
    bucketFlashSeconds: 0.5,
    bucketPopSeconds: 0.42,
    pegFlashSeconds: 0.32,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 650,
    lowTimeSeconds: 15,
    // Pause between a coin settling and the next drop being allowed.
    reloadSeconds: 0.28,
  },
};

/** The goal ladder as unique rungs, highest first — the shape the screens want. */
export const BUCKET_LADDER = (() => {
  const seen = new Set();
  return GAME_CONFIG.buckets
    .filter((b) => {
      if (seen.has(b.key)) return false;
      seen.add(b.key);
      return true;
    })
    .sort((a, b) => b.mult - a.mult);
})();

/** Score the Results ring treats as a full circle: the win line itself. */
export const RESULT_TARGET_SCORE = GAME_CONFIG.scoring.targetScore;
