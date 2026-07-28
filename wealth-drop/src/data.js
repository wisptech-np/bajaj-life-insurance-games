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

  /* -- Pocket ladder, left to right --------------------------------------
     Eleven pockets. Home x3 holds the disciplined centre, Education x2 flanks
     it, then the two red Market Risk x0 bands, then the Retirement x5 jackpots
     sitting JUST BEYOND the risk bands, and a wide Savings x1 gutter along both
     outer edges. Reaching the x5 means aiming across the volatility band and
     stopping there; overshoot and you are in the savings gutter. That is the
     financial hook laid out as geometry, and unlike a ladder that simply rises
     toward the walls it cannot be farmed by parking on one end of the rail.

     BALANCE — this arrangement is measured, not decorative. Win rate by aim
     profile at each ladder's own ~40%-casual target, 407x612 canvas
     (`node tools/balance-sim.mjs`):

       ladder                          wall  lane0  lane1  lane2  centre  casual
       [5 1 0 2 3 2 0 1 5]   (9-lane) 51.6%  59.9%  48.0%  27.7%  45.6%   38.4%
       [1 5 0 3 2 3 0 5 1]   (9-lane) 51.6%  57.1%  59.4%  ~30%   40.5%   40.5%
       [1 2 0 3 5 3 0 2 1]   (9-lane)  0.1%   0.0%   0.3%   6.2%  57.4%   40.7%
       [3 2 0 1 5 1 0 2 3]   (9-lane) 41.1%  44.3%  32.9%  19.3%  49.3%   40.1%
       [1 1 5 0 2 3 2 0 5 1 1]        22.3%  22.4%  28.9%  32.8%  38.4%   43.9%  <-- shipped

     The first is the obvious "biggest prize outside" ladder and it is a solved
     board: parking against a wall wins ~1.5x as often as a centre drop, and on
     a 360x640 handset it measured 77%. Its mirror image over-corrects — the
     edges become unwinnable and the rail turns into a "do not miss the middle"
     test. The shipped ladder holds every profile inside a 22-44% band: aiming
     badly costs you real money, but no single spot on the rail wins the game
     for you.

     board.laneCount MUST equal buckets.length. `label` is the short form drawn
     on the pocket face (pockets are narrow at eleven lanes); `full` is what the
     banners and the screens use. */
  buckets: [
    { key: 'save', label: 'SAV', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
    { key: 'save', label: 'SAV', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
    { key: 'retire', label: 'RET', full: 'Retirement', mult: 5, kind: 'goal', color: '#FFC845', colorLt: '#FFE38A' },
    { key: 'risk', label: 'RISK', full: 'Market Risk', mult: 0, kind: 'risk', color: '#EF4444', colorLt: '#FF8B8B' },
    { key: 'edu', label: 'EDU', full: 'Education', mult: 2, kind: 'goal', color: '#3B8DD4', colorLt: '#9FD0FF' },
    { key: 'home', label: 'HOME', full: 'Home', mult: 3, kind: 'goal', color: '#1E6BE0', colorLt: '#7FB6FF' },
    { key: 'edu', label: 'EDU', full: 'Education', mult: 2, kind: 'goal', color: '#3B8DD4', colorLt: '#9FD0FF' },
    { key: 'risk', label: 'RISK', full: 'Market Risk', mult: 0, kind: 'risk', color: '#EF4444', colorLt: '#FF8B8B' },
    { key: 'retire', label: 'RET', full: 'Retirement', mult: 5, kind: 'goal', color: '#FFC845', colorLt: '#FFE38A' },
    { key: 'save', label: 'SAV', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
    { key: 'save', label: 'SAV', full: 'Savings', mult: 1, kind: 'goal', color: '#4E7FB8', colorLt: '#A9C8E8' },
  ],

  /* -- Board geometry -----------------------------------------------------
     Everything is derived from the measured canvas, so the board is the same
     board on a 360 px phone and a 430 px one: lane pitch scales with width and
     the peg field stretches to whatever height is left between the aim rail and
     the bucket mouths. Radii are fractions of the lane pitch for the same
     reason — a fixed px coin radius would be a different game on each device. */
  board: {
    laneCount: 11,
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
    // Row spacing band, x pitch. The floor keeps the field legible on a short
    // screen; the ceiling stops a tall one stretching the rows apart far enough
    // to change the landing distribution (measured 1.54x pitch at 430x900
    // before the clamp). It binds on most portrait phones, which is why the
    // field height — and so velScale — is nearly constant across them.
    minRowGapFrac: 0.5,
    maxRowGapFrac: 1.15,
  },

  /* -- Coin physics -------------------------------------------------------
     Circle-vs-circle against every peg, with restitution and a jittered contact
     normal. The jitter is what stops the board being a solved puzzle: two coins
     dropped on the same pixel take visibly different paths, which is the point
     of a volatility game. */
  physics: {
    // Reference peg-field height, px. Gravity and every velocity below are
    // authored against a field this tall and scaled by `board.velScale` =
    // fieldH / refFieldPx, so the coin's path is geometrically similar at every
    // canvas size. See the note in buildBoard(): without this the coin keeps its
    // absolute sideways authority while the field shrinks with the screen, and
    // a short handset turns the landing bell almost flat.
    refFieldPx: 362,
    gravity: 2300,
    // Speed ceiling before `maxStepFraction` is applied. Both are scaled by
    // velScale; whichever is lower binds. On a 407 px canvas the step guard
    // binds first (8.6 px/step against a 9.6 px collision radius), which is the
    // point — no tunnelling through the peg field at any size.
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
    // the landing distribution measured flat — every pocket equally likely from
    // a dead centre drop, i.e. the aim rail did nothing. At 6 / 230 (scaled by
    // velScale) the landing lane is a bell of sigma ~2.0 lanes around the
    // release point, at every canvas size.
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
    // Minimum downward speed handed to a coin crossing a pocket mouth, so it
    // always settles rather than creeping down the last few pixels.
    pocketEntryVy: 160,
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

     Columns are lane indices on a centre peg row (0..laneCount-1) and fan
     outward as the rows descend, because that is where a coin that has drifted
     wide actually travels — and drifting wide is exactly what walks a coin into
     a Risk band. Cover is placed on the path of the coins that need it. */
  shieldPegs: {
    slots: [
      { row: 2, cols: [4, 6] },
      { row: 4, cols: [3, 7] },
      { row: 6, cols: [2, 3] },
      { row: 6, cols: [7, 8] },
      { row: 8, cols: [1, 2] },
      { row: 8, cols: [8, 9] },
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
     BALANCE (measured — run `node tools/balance-sim.mjs --runs 8000 --sweep`,
     which executes the shipping physics, not a re-implementation). 8,000 runs
     per aim profile, seed 0x5eed1234. Win rate at target 2700:

       aim profile          407x612   407x556   338x452
       wall (rail extreme)    22.4%     20.2%     20.5%
       lane 0 centre          22.2%     22.3%     21.9%
       lane 1 centre          28.6%     27.4%     27.0%
       lane 2 centre          30.9%     31.3%     30.9%
       dead centre            35.4%     34.0%     34.8%
       casual (middle three)  40.3%     38.2%     37.3%
       spread (whole rail)    32.8%     32.5%     31.7%

     Casual play is the ~40% line the brief asks for, and it is also the BEST
     line — every edge profile is 10-20 points worse, so parking against a wall
     is a way to lose, not a way to farm. Expected payout per coin by aim lane
     (12,000 drops per lane) is a gentle dome:

       lane      0    1    2    3    4    5    6    7    8    9   10
       407x612 172  190  196  206  213  211  217  216  197  189  175
       338x452 170  184  198  204  213  209  219  211  201  187  173

     best/centre is 1.03 (407x612) and 1.05 (338x452), so no single release
     point is worth more than a few percent over the middle — but aiming into
     the savings gutter costs ~20% of expected payout.

     Pocket share per coin, centre drop at 407x612:
       SAV x1 1.3% | SAV x1 3.4% | RET x5 6.8% | RISK x0 12.7% | EDU x2 17.0%
       | HOME x3 18.1% | EDU x2 16.8% | RISK x0 12.7% | RET x5 6.7%
       | SAV x1 3.4% | SAV x1 1.3%
     25.4% of coins land in a Risk pocket and 45.3% of those are rescued by
     cover, so 13.9% of all coins pay nothing. Cover is picked up on 26-47% of
     drops depending on aim; 0.4-1.2 saves per run; best streak averages 6.8-8.6
     of 10. A run spends 23-26 s of the 90 s cap watching coins fall.

     2700 sits just above the casual mean (2535), so a losing run reads as one
     bad bounce short rather than hopeless. See README.md "Balance notes". */
  scoring: {
    targetScore: 2700,
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
    // Recovery time for the coin's squash-and-stretch after a peg hit. Read by
    // the pure physics step (it owns the coin's presentation timers) and fed to
    // the kit's elastic squash curve.
    coinSquashSeconds: 0.22,
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
