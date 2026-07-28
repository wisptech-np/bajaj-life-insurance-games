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

   Colour grammar for the course, kept consistent with the rest of the catalog:
   green is ALWAYS risk (viruses, the uncertainty rivers, the risk tide), blue is
   ALWAYS protection (safe rows, coverage platforms, the guardian, shield tokens),
   gold is wealth (coins) and the milestone rules. That is why safe rows are a
   blue-slate pavement rather than the usual green grass — grass would put the
   safest thing on screen in the exact colour of the deadliest. */
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
  virus: '#49E24B',
  virusCore: '#0E5C1D',
  danger: '#EF4444',
  bgDark: '#0B1221',
  skyTop: '#061634',
  skyMid: '#0A2444',
  skyLow: '#0E3160',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  // Row slabs: [top face light, top face dark, front face] per lane type.
  rowSafeTop: '#2E63A8',
  rowSafeBot: '#204B82',
  rowSafeFront: '#123059',
  rowSafeAltTop: '#27579A',
  rowSafeAltBot: '#1B4275',
  rowSafeAltFront: '#0F2A4E',
  rowRoadTop: '#242E45',
  rowRoadBot: '#171F31',
  rowRoadFront: '#0B1120',
  rowRiverTop: '#12483B',
  rowRiverBot: '#0B2E27',
  rowRiverFront: '#061A15',
  rowGoalTop: '#249049',
  rowGoalBot: '#166433',
  rowGoalFront: '#0B3B1D',

  planter: '#17335C',
  planterRim: '#3B72B8',
  shrub: '#6E9C8A',
  shrubDeep: '#3F6B5C',
  platformGlass: 'rgba(126,184,255,0.34)',
  platformEdge: 'rgba(180,214,255,0.85)',
  tideFog: 'rgba(30,150,70,0.0)',
  tideFogMid: 'rgba(28,140,64,0.55)',
  tideFogDeep: 'rgba(9,60,28,0.94)',
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
  milestoneRows: {
    8: 'Graduation',
    16: 'First Job',
    24: 'Marriage',
    32: 'Home',
    40: 'Child',
    48: 'Retirement',
  },

  hop: {
    seconds: 0.12,
    arcHeight: 14,
    // One buffered input while airborne. Chaining buffered hops is deliberately
    // allowed — the from/to occupancy switch at t=0.5 (see the component) means
    // a chained hopper still occupies a cell every frame, so it cannot phase
    // through a road untouched.
    bufferOne: true,
    // Blocked-hop bump: how far the guardian leans into the obstacle, and for
    // how long, before springing back.
    bumpPx: 7,
    bumpSeconds: 0.16,
  },

  roads: {
    minSpeed: 90,
    maxSpeed: 220,
    minGapCells: 2.2,
    maxViruses: 4,

    // -- derived spacing guard rails (CORRECTION) --------------------------
    // Lane speeds are authored in px/s at this reference cell width, then
    // converted to cells/s. Without the conversion the same lane is measurably
    // harder on a narrow phone (a 220 px/s virus crosses a 48 px cell in 0.22 s
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
    // Viruses wrap around a cycle sized from the spacing, not from the screen,
    // so a lane can be genuinely sparse without ever showing two copies of the
    // same blob. This margin is the dead space beyond each edge that the cycle
    // must at minimum cover.
    spawnMarginCells: 1.4,
    virusCells: 0.8,
    // Collision half-width, in cells: |virusCol - playerCol| < hitCells.
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
    // A shield that only absorbs the hit leaves the guardian standing on the
    // virus that just spent it, so the next frame kills them anyway. The
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
    bannerSeconds: 1.8,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
  },
};

/** Milestones as an ordered list — the shape the Results screen wants. */
export const MILESTONE_LIST = Object.keys(GAME_CONFIG.milestoneRows)
  .map((row) => ({ row: Number(row), label: GAME_CONFIG.milestoneRows[row] }))
  .sort((a, b) => a.row - b.row);

/** Score the Results ring treats as a full circle.
    A completed run measures ~2,750: 480 (48 rows) + 1,800 (6 milestones)
    + ~200 (coins) + ~270 (time bonus). See README "Balance notes". */
export const RESULT_TARGET_SCORE = 2800;
