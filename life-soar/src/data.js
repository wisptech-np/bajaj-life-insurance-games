// Life Soar — every flight / pacing number lives here. Nothing tunable in LifeSoarGame.jsx.
//
// UNITS: the game loop is delta-time based, so speeds are px/second and
// accelerations are px/second². Multiply a px/frame value by 60 to get px/s,
// by 3600 to get px/s². (The old build used raw per-frame constants, which is
// why it ran faster on high-refresh phones.)

export const WORLD = {
  metresToPx: 12,        // 1 m of HUD distance = 12 world px
  maxDistanceM: 2000,    // finish line
  durationSeconds: 105,  // hard session cap
  graceSeconds: 2.0,     // auto-pilot at the start, no collisions
  startX: 100,
  cameraLeadPx: 120,     // how far from the left edge the glider sits
};

export const FLIGHT = {
  // ── forward motion (px/s) ───────────────────────────────────────────
  cruiseSpeed: 235,      // was 360 px/s (6 px/frame)
  minSpeed: 195,         // was 288 px/s (4.8 px/frame)
  maxSpeed: 340,         // was 660 px/s (11 px/frame) — the twitchy top end
  diveAccelX: 330,       // px/s² gained while holding — was 576
  dragX: 140,            // px/s² bleed back toward minSpeed — was 180

  // ── vertical motion (px/s²) ─────────────────────────────────────────
  gravity: 240,          // was 468
  diveAccelY: 520,       // extra downward pull while holding — was 1008
  cruiseLift: 75,        // baseline lift when released — was 144
  liftPerExcessSpeed: 5.6, // lift per px/s of speed above minSpeed — was 16.8
  maxRiseSpeed: 235,     // px/s clamp — was 360
  maxFallSpeed: 275,     // px/s clamp — was 420

  // ── input forgiveness ───────────────────────────────────────────────
  inputBufferMs: 130,    // a flick-tap still dives this long (was 0)
  coyoteMs: 150,         // grace after clipping a wall before it kills (was 0)
  gliderRadius: 14,
};

// Gentle difficulty ramp: forward speeds are multiplied by this over the run,
// so a slow, readable opening still ends up demanding.
export const RAMP = {
  start: 1.0,
  end: 1.45,
  seconds: 70,
};

export const LAYOUT = {
  hazardSpacingPx: 460,       // was 380
  spikeOffsetPx: 230,         // floor spike sits this far after the ceiling one
  floatHazardEveryN: 2,       // every Nth hazard slot is a bobbing risk blob
  pickupSpacingPx: 660,       // was 550
  shieldEveryNPickups: 4,     // every Nth pickup slot is a shield instead of coins
  milestoneClearancePx: 250,
};

export const MILESTONES = [
  { m: 200,  name: 'Graduation',    color: '#3B8DD4', tip: 'Start building emergency funds!' },
  { m: 500,  name: 'First Job',     color: '#22C55E', tip: 'Invest early to compound wealth!' },
  { m: 900,  name: 'Marriage',      color: '#FF8533', tip: 'Get joint cover for your partner!' },
  { m: 1400, name: 'Home Purchase', color: '#EC4899', tip: 'Secure your mortgage with Term Insurance!' },
  { m: 2000, name: 'Retirement',    color: '#FACC15', tip: 'Enjoy guaranteed lifelong pension!' },
];

export const SCORING = {
  perCoin: 25,
  perMilestone: 300,
};
