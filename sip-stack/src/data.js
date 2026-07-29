// data.js — SIP Stack tunables. Every number a designer might retune lives here.
//
// Logical coordinate space: width is fixed at LOGICAL_WIDTH; height follows the
// device aspect. The canvas is scaled so 1 logical px maps to css/LOGICAL_WIDTH.

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
  baseMarginBottom: 96,         // px between canvas bottom and the base slab top

  // ---- Tower geometry -----------------------------------------------------
  blockHeight: 28,              // logical px per layer
  startWidthFrac: 0.5,          // first slab = 50% of logical width
  slabDepth: 9,                 // pseudo-3D top-face depth (vertical)
  slabShear: 10,                // pseudo-3D top-face shear (horizontal)

  // ---- Session / goal -----------------------------------------------------
  targetLayers: 30,             // WIN: 30 slabs placed = Retirement Corpus summit

  // ---- Slide motion (LINEAR back-and-forth, constant during a slide) ------
  // Traverse = seconds for one full crossing of the track. Steps apply only
  // between blocks, never mid-slide.
  speedSteps: [
    { fromLayer: 1, traverseSeconds: 1.6 },   // layers 1–10
    { fromLayer: 11, traverseSeconds: 1.35 }, // layers 11–20
    { fromLayer: 21, traverseSeconds: 1.1 },  // layers 21–30 (~1.45× start speed)
  ],
  spawnPhaseMaxFrac: 0.35,      // random phase offset into the track at spawn (anti-metronome)

  // ---- Drop / trim --------------------------------------------------------
  minKeepWidthPx: 8,            // kept width below this = treated as a total miss
  perfectWindowPx: 12,          // perfect if |offset| <= max(this, frac * width)
  perfectWindowFrac: 0.10,
  regrowFromStreak: 3,          // from the 3rd consecutive perfect onward…
  regrowFrac: 0.12,             // …regrow +12% of ORIGINAL width per perfect
  chunkKickVx: 60,              // sheared overhang sideways kick (px/s)
  chunkSpinMax: 3.2,            // rad/s random spin on the falling chunk

  // ---- Scoring ------------------------------------------------------------
  scorePerBlock: 1,
  scorePerPerfect: 2,           // on top of the block point
  threeStarPerfects: 15,        // 3★ = win with at least this many perfects
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
  cameraTopMarginFrac: 0.32,    // moving slab pinned ~32% from the top once tall
  hueDriftPerBlock: 3,          // background + slab hue drift per layer (degrees)
  slabHueStart: 216,            // brand blue…
  slabHueEnd: 130,              // …to brand green at the summit
  pulseScale: 1.05,             // tower scale pulse per placement
  pulseSeconds: 0.18,

  // ---- Milestones (every 6th layer) --------------------------------------
  milestones: {
    6: 'SIP Year 1',
    12: 'SIP Year 5',
    18: 'Home Goal',
    24: 'Education Goal',
    30: 'Retirement Corpus',
  },
  milestoneBannerSeconds: 1.8,

  // ---- End choreography ---------------------------------------------------
  winZoomSeconds: 1.4,          // full-tower zoom-out pan
  winHoldSeconds: 3.0,          // total time on the summit view before results
  loseHoldSeconds: 1.5,
  loseShake: 9,                 // screen shake on the losing miss
};
