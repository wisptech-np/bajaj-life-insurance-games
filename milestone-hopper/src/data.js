// data.js — Milestone Hopper tunables.
//
// Every number a designer would want to retune lives here. MilestoneHopperGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants in
// the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar, unique to this game in the catalog:
     BLUE   = ground you own — safe pavement, coverage platforms, the hopper.
     GOLD   = wealth and the milestone gates (this game's accent; every gate is a
              gold chevron rule, which is also the shape language: chevrons
              always point up-course, in the direction of progress).
     EMBER  = the only hazard colour — the debt weights sliding across the
              expense lanes, and the arrears tide climbing behind you.
     SLATE  = the uncertainty rivers (cold, unlit, nothing to stand on).
     GREEN  = reserved exclusively for a milestone that has been *reached*.

   That last rule is the reason the old green hazard had to go: green was doing
   double duty as both "you made it" and "this kills you". Now nothing green on
   screen can hurt you, and anything ember can. */
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

  /* Debt weight — the hazard. Ember cast iron: hot rim, dead-black core. */
  debt: '#D0421F',
  debtLt: '#FF8A3D',
  debtHot: '#FFD3A0',
  debtDeep: '#390C05',
  debtGlow: 'rgba(255,122,45,0.6)',

  danger: '#EF4444',
  bgDark: '#0B1221',
  skyTop: '#050F26',
  skyMid: '#0A2444',
  skyLow: '#123A6E',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  // Row slabs: [top face light, top face dark, front face] per lane type.
  rowSafeTop: '#3570B8',
  rowSafeBot: '#23508A',
  rowSafeFront: '#123059',
  rowSafeAltTop: '#2C63A8',
  rowSafeAltBot: '#1D477E',
  rowSafeAltFront: '#0F2A4E',
  rowRoadTop: '#332635',
  rowRoadBot: '#1E1622',
  rowRoadFront: '#100A14',
  rowRiverTop: '#123A52',
  rowRiverBot: '#0A2436',
  rowRiverFront: '#05141F',
  rowGoalTop: '#249049',
  rowGoalBot: '#166433',
  rowGoalFront: '#0B3B1D',

  planter: '#17335C',
  planterRim: '#5B93D8',
  shrub: '#7FB8D8',
  shrubDeep: '#3D6E96',
  platformGlass: 'rgba(126,184,255,0.34)',
  platformEdge: 'rgba(190,222,255,0.9)',
  tideFogMid: 'rgba(168,52,18,0.62)',
  tideFogDeep: 'rgba(46,10,4,0.96)',
};

/* ─── Gameplay configuration ──────────────────────────────
   The first block is the balance sheet agreed in the design spec. The blocks
   below it (`rows`, `pickups`, `player`, `camera`, `view`, `fx`, `hud`) are
   presentation and generation tunables that the same designer would reach for,
   kept here rather than buried in the component.

   Balance corrections carried against the spec's literal reading are marked
   CORRECTION and are explained in README.md "Balance notes". */
export const GAME_CONFIG = {
  sessionSeconds: 120,
  cols: 7,
  totalRows: 48,

  /* Milestone gates. Each one is a named life goal that BANKS a rupee corpus and
     pays a reward, so progression and the insurance concept are the same thing
     rather than a label on a green band. `milestoneRows` is derived below and
     kept only because generation and rendering index gates by row. */
  milestones: [
    { row: 8, label: 'Graduation', goal: 'Education fund', corpus: 500000, corpusLabel: '₹5 L' },
    { row: 16, label: 'First Job', goal: 'First term cover', corpus: 1000000, corpusLabel: '₹10 L' },
    { row: 24, label: 'Marriage', goal: 'Family cover', corpus: 2500000, corpusLabel: '₹25 L' },
    { row: 32, label: 'Home', goal: 'Home loan cover', corpus: 5000000, corpusLabel: '₹50 L' },
    { row: 40, label: 'Child', goal: 'Child education', corpus: 7500000, corpusLabel: '₹75 L' },
    { row: 48, label: 'Retirement', goal: 'Retirement corpus', corpus: 10000000, corpusLabel: '₹1 Cr' },
  ],

  /* What a gate PAYS, over and above the score. All three are on-theme: your
     cover renews at every life stage, protection buys back time, and a secured
     goal compounds everything you earn after it. */
  rewards: {
    // Every gate hands back an active cover token (a spent one is restored).
    coverOnMilestone: true,
    // Seconds added to the session clock per gate.
    timeSeconds: 8,
    // Row and coin score multiply by 1 + gatesReached * this.
    multiplierPerMilestone: 0.25,
  },

  hop: {
    // 115 ms of commitment. Short enough that the third tap of a chain is never
    // waiting on the first, long enough for the arc to read as a hop.
    seconds: 0.115,
    // Arc height as a FRACTION OF A CELL, not absolute px. The old 14 px was
    // 30% of a cell on a 320 px handset and 24% on a 412 px one: the same hop
    // read differently per device, and on the large one it read as a slide.
    arcCellFrac: 0.5,
    // How many inputs can be held while airborne. One was not enough: a player
    // double-tapping to cross a lane lost the second tap, which is exactly the
    // moment they most need it. The most recent input always survives.
    bufferDepth: 2,
    // Blocked-hop bump: how far the guardian leans into the obstacle, and for
    // how long, before springing back.
    bumpPx: 7,
    bumpSeconds: 0.16,
    // Tide forgiveness while airborne (see component `tideRowOf`). A hop that
    // was legal when it started is not retro-killed by the tide reaching the
    // cell you have already left.
    coyoteRows: true,
  },

  input: {
    // Direction is resolved on POINTER DOWN from where the thumb landed, so a
    // hop never waits for the finger to lift. Outer `sideZoneFrac` of the canvas
    // width on each side hops sideways; everything between hops forward.
    sideZoneFrac: 0.24,
  },

  roads: {
    minSpeed: 90,
    maxSpeed: 220,
    minGapCells: 2.2,
    maxWeights: 4,

    // -- second obstacle: the HEAVY lane -----------------------------------
    // A share of expense lanes carry one wide, slow EMI block instead of a
    // stream of small weights. Same colour grammar, completely different dodge:
    // a small weight is a timing gap, a heavy block is a wall you go around.
    heavyChance: 0.34,
    heavyCells: 1.95,
    heavySpeedFactor: 0.6,
    heavyHitCells: 0.95,
    heavyMaxCount: 2,

    // -- derived spacing guard rails (CORRECTION) --------------------------
    // Lane speeds are authored in px/s at this reference cell width, then
    // converted to cells/s. Without the conversion the same lane is measurably
    // harder on a narrow phone (a 220 px/s weight crosses a 48 px cell in 0.22 s
    // but a 60 px cell in 0.27 s), and course generation — which runs at mount,
    // before the canvas has been measured — has no cell size to reason about.
    refCellPx: 56,
    // The real spacing control: how long the player can stand in the widest part
    // of a lane gap before something touches them, lerped across segments 0..5.
    // `minGapCells` alone does not deliver this — at 220 px/s a 2.2-cell gap is
    // a 0.28 s standing window, which is not a crossing, it is a coin flip — and
    // measured play at 0.7 s still died on the second road of any run. Spacing
    // is derived from whichever floor binds, so the lane always reads the same
    // way to a player however fast it is running.
    gapSeconds: [1.8, 1.2],
    // Weights wrap around a cycle sized from the spacing, not from the screen,
    // so a lane can be genuinely sparse without ever showing two copies of the
    // same weight. This margin is the dead space beyond each edge that the cycle
    // must at minimum cover.
    spawnMarginCells: 1.4,
    // Drawn width of a debt weight, in cells. Kept under `hitCells * 2` plus a
    // little, so the sprite never looks wider than the thing that kills you.
    weightCells: 1.15,
    // Collision half-width, in cells: |weightCol - playerCol| < hitCells.
    hitCells: 0.55,
  },

  rivers: {
    afterRow: 24,
    platformSpeed: [70, 130],
    platformCells: [2, 3],
    gapCells: [1.5, 2.5],
    // Share of non-safe rows past `afterRow` that become rivers.
    chance: 0.25,
    // Never three rivers in a row: with a 7-wide grid and drifting platforms a
    // third consecutive crossing has no bank to read the pattern from.
    maxConsecutive: 2,
    // Landing forgiveness at a platform edge, in cells (CORRECTION). A strict
    // edge test makes a 2-cell platform moving at 130 px/s a ~0.8 s window with
    // no margin for the 0.12 s hop; the grace turns a near-miss into a scramble
    // rather than a death.
    edgeGraceCells: 0.28,
    // Carried past this far outside the grid and the fog takes you.
    carryOutCells: 0.75,
  },

  tide: {
    startRow: -3,
    secondsPerRow: 3.2,
    minSecondsPerRow: 2.0,
    // Pace lerps from secondsPerRow to minSecondsPerRow across rows 0..rampEndRow.
    rampEndRow: 32,
    // HUD chevron appears when the tide is within this many rows.
    warnRows: 3,
  },

  scoring: {
    row: 10,
    coin: 25,
    milestone: 300,
    timeBonusPerSecond: 5,
  },

  /* -- course generation ------------------------------------------------- */
  rows: {
    // Chance a non-milestone row is safe, lerped across segments 0..5. Averages
    // ~34%, and the forced river banks below push the realised share to ~40%.
    safeChanceStart: 0.42,
    safeChanceEnd: 0.26,
    // Probability table for 0 / 1 / 2 blocking cells on a safe row.
    treeChance: [0.45, 0.4, 0.15],
    // The opening rows are always clear so the first hop is never a decision.
    clearUntilRow: 2,
    // Longest run of road rows before a safe island is forced (CORRECTION).
    // At the authored safe share, runs of 5+ roads occur often enough to be the
    // dominant cause of death: with nowhere to stand and read the next lane,
    // crossing them is luck rather than timing. Capping the run is what turns
    // a road stretch into a sequence of decisions.
    maxRoadRun: 3,
  },

  pickups: {
    coinChance: 0.15,
    shieldPerSegment: 1,
    // The run begins with cover already in force. It is the single cheapest
    // thing that fixes the first-timer experience — a blind first hop onto an
    // expense lane used to end the session in about three seconds, which is a
    // terrible first impression for a funnel game — and it is exactly the point
    // the game is making: you start covered, debt spends that cover, and every
    // life milestone renews it.
    startWithCover: true,
    // A shield that only absorbs the hit leaves the guardian standing on the
    // weight that just spent it, so the next frame kills them anyway. The
    // invulnerability window is what makes the token a save rather than a stay
    // of execution (CORRECTION).
    shieldInvulnSeconds: 1.0,
  },

  player: {
    startCol: 3,
    // Guardian cube width as a fraction of a cell.
    cubeFrac: 0.6,
    idleBobPx: 2.4,
    landSquashSeconds: 0.22,
  },

  camera: {
    // Screen y of the top edge of the camera's anchor row, as a fraction of H.
    anchorFrac: 0.8,
    // The camera sits this many rows behind the furthest row reached.
    leadRows: 3,
    lambda: 6,
  },

  view: {
    // Row band height and front-face height, both as fractions. A band shorter
    // than a cell is the whole pseudo-3D trick: it reads as a foreshortened
    // floor, and it puts ~8 rows of read-ahead on screen instead of 5.
    rowHFrac: 0.82,
    frontFrac: 0.26,
    tideDepthPx: 240,
    // Entities stand this far down the top face.
    groundFrac: 0.62,
  },

  fx: {
    damageShake: 6,
    hitStopSeconds: 0.09,
    hopParticles: 6,
    landParticles: 8,
    coinParticles: 10,
    shieldParticles: 14,
    hitParticles: 18,
    milestoneParticles: 22,
    winParticles: 40,
    bannerSeconds: 2.2,
    // Gold shockwave ring thrown out of a gate as it banks.
    gateRingSeconds: 0.7,
    // How long the gate-approach glow builds over, in rows.
    gateGlowRows: 4,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
    // Corpus counter lerp — same feel as the score counter.
    corpusLerpPerSecond: 7,
  },
};

/** Milestones as an ordered list — the shape the Screens want. */
export const MILESTONE_LIST = GAME_CONFIG.milestones;

/** row -> label, the index generation and rendering use. Derived so the gate
    table has exactly one source of truth. */
GAME_CONFIG.milestoneRows = Object.fromEntries(
  GAME_CONFIG.milestones.map((m) => [m.row, m.label]),
);

/** row -> full gate record, for the reward payout at landing. */
export const MILESTONE_BY_ROW = Object.fromEntries(
  GAME_CONFIG.milestones.map((m) => [m.row, m]),
);

/** Total corpus a complete run banks: ₹2.65 Cr. */
export const TOTAL_CORPUS = GAME_CONFIG.milestones.reduce((a, m) => a + m.corpus, 0);

/** Multiplier label with no trailing zeros: 1 -> "1", 1.5 -> "1.5", 1.25 -> "1.25". */
export const formatMult = (m) => String(Number(m.toFixed(2)));

/** Short ₹ label for a rupee amount — L above a lakh, Cr above a crore. */
export function formatCorpus(n) {
  if (n >= 10000000) {
    const v = n / 10000000;
    return `₹${v % 1 === 0 ? v : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} Cr`;
  }
  if (n >= 100000) return `₹${Math.round(n / 100000)} L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)} K`;
  return `₹${n}`;
}

/** Score the Results ring treats as a full circle.
    A completed run with the compounding multiplier measures ~3,900:
    ~1,000 (48 rows, compounded) + 1,800 (6 gates) + ~450 (coins, compounded)
    + ~650 (time bonus, now boosted by the +8 s per gate). See README. */
export const RESULT_TARGET_SCORE = 3900;
