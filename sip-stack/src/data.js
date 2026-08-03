// data.js — SIP Stack tunables. Every number a designer might retune lives here.
//
// Logical coordinate space: width is fixed at LOGICAL_WIDTH; height follows the
// device aspect. The canvas is scaled so 1 logical px maps to css/LOGICAL_WIDTH.
// The rules that consume these numbers live in src/stack.js (pure, importless)
// so scripts/balance.mjs can drive the shipping code headless.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  bgDark: '#0B1221',
  white: '#FFFFFF',
  gold: '#FFC845',
};

export const GAME_CONFIG = {
  // ---- Logical space ------------------------------------------------------
  logicalWidth: 390,            // fixed logical width; height = css height / scale
  baseMarginBottom: 92,         // px between canvas bottom and the base slab top

  // ---- Tower geometry -----------------------------------------------------
  // ONE source of truth: src/stack.js slabFaces() builds every drawn polygon
  // from (blockHeight, slabDepth, slabShear) AND the drop is judged on the same
  // [x, x + w] footprint. scripts/balance.mjs asserts they are identical.
  blockHeight: 26,              // logical px per layer
  startWidthFrac: 0.315,        // first slab = 31.5% of logical width, so the whole
                                //   sweep (tower + 2x slab) fits on screen at every layer
  slabDepth: 8,                 // pseudo-3D top-face depth (vertical)
  slabShear: 10,                // pseudo-3D top-face shear (horizontal, inset)

  // ---- Session / goal -----------------------------------------------------
  targetLayers: 40,             // WIN: 40 slabs placed = Retirement Corpus summit

  // ---- Slide motion (LINEAR back-and-forth, constant during a slide) ------
  // Traverse = seconds to cross a FULL-WIDTH track. Steps apply only between
  // blocks, never mid-slide. Speed in px/s is held constant for a layer, so a
  // narrow tower crosses its shorter track proportionally faster — see
  // stack.js crossSecondsFor() for why deriving it from the live track instead
  // made the difficulty ramp run backwards.
  speedSteps: [
    { fromLayer: 1, traverseSeconds: 3.8 },   // layers 1–6: a gentle opening, so a
    { fromLayer: 7, traverseSeconds: 2.9 },   //   first-timer gets a real session
    { fromLayer: 15, traverseSeconds: 2.3 },  //   instead of thirteen seconds
    { fromLayer: 25, traverseSeconds: 1.8 },  // layers 25–34
    { fromLayer: 35, traverseSeconds: 1.5 },  // layers 35–40 (~2.5× the opening speed)
  ],
  spawnPhaseMaxFrac: 0.7,       // random phase offset at spawn (anti-metronome)
  trackEdgePx: 8,               // slab stays this far inside the canvas edges

  // ---- Drop / trim --------------------------------------------------------
  minKeepWidthPx: 12,           // kept width below this = treated as a total miss
  perfectWindowPx: 3,           // perfect if |offset| <= max(this, frac * width)
  perfectWindowFrac: 0.03,      // 10% of a 195px slab was wider than a casual
                                //   player's whole timing error — nobody could lose
  regrowFromStreak: 3,          // from the 3rd consecutive perfect onward…
  regrowFrac: 0.07,             // …regrow +7% of ORIGINAL width per perfect. At 12%
                                //   one perfect refunded more than a typical trim cost,
                                //   so a tower could never actually narrow.
  chunkKickVx: 60,              // sheared overhang sideways kick (px/s)
  chunkSpinMax: 3.2,            // rad/s random spin on the falling chunk

  // ---- SIP compounding (this IS the score) --------------------------------
  // corpus = corpus * (1 + growthPerLayer) + contribution, per placed layer.
  // Early layers compound for longer, so they end the run worth more than late
  // ones — the tower reads as a corpus, not a pile. Indicative game points only.
  contributionBase: 100,        // a full-width layer's SIP instalment
  contributionMinFrac: 0.3,     // a hair-thin layer still pays this much of it
  perfectContributionMult: 1.5, // a centred drop is a bigger instalment
  growthPerLayer: 0.06,         // growth step applied to the whole tower per layer
  threeStarPerfects: 22,        // 3★ = win with at least this many perfects
  bestScoreKey: 'sipStackBestScore',

  // ---- Input --------------------------------------------------------------
  spawnLockSeconds: 0.2,        // input refused during spawn animation
  // Anti-pause-scum re-acquire (kit auto-pauses on visibilitychange; on resume
  // the world stays frozen behind a 3-2-1 countdown and the slab phase +
  // direction are re-randomised so pausing yields zero aiming information).
  reacquireFreezeSeconds: 0.9,  // 3 beats × 300ms
  reacquireLockSeconds: 0.25,   // taps still refused for one human reaction after GO

  // ---- Camera & colour ----------------------------------------------------
  cameraLerpSeconds: 0.25,      // camera rises one block-height per placement
  cameraTopMarginFrac: 0.34,    // moving slab pinned ~34% from the top once tall
  // Slab hue is a function of a layer's AGE, not its index: a block placed now
  // is brand blue and ripens toward gold as more SIPs land on top of it, so the
  // tower visibly matures from the base up while you play.
  slabHueStart: 214,            // freshly placed — brand blue
  slabHueMature: 44,            // fully compounded — gold
  matureAfterLayers: 14,        // layers of growth to reach the gold end
  bgHueDriftPerBlock: 2.4,      // background hue drift per layer (degrees)
  pulseScale: 1.04,             // tower scale pulse per placement
  pulseSeconds: 0.18,
  growthWaveSeconds: 0.55,      // gold "everything you own just grew" sweep

  // ---- Collapse -----------------------------------------------------------
  collapseScanRows: 7,          // shear at the narrowest layer within this many
  collapseKickVx: 120,          // sideways kick on toppling debris (px/s)
  collapseSpin: 2.6,            // rad/s spin on toppling debris

  // ---- Milestones (every 8th layer) --------------------------------------
  milestoneEvery: 8,
  milestones: {
    8: 'SIP Year 1',
    16: 'Emergency Fund',
    24: 'Home Goal',
    32: 'Education Goal',
    40: 'Retirement Corpus',
  },
  milestoneBannerSeconds: 1.8,

  // ---- End choreography ---------------------------------------------------
  winZoomSeconds: 1.4,          // full-tower zoom-out pan
  winHoldSeconds: 3.0,          // total time on the summit view before results
  loseHoldSeconds: 2.0,
  loseShake: 9,                 // screen shake on the losing miss
};
