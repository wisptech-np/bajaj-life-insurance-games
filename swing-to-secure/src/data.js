// data.js — Swing to Secure tunables.
//
// Every number a designer would want to retune lives here. SwingToSecureGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph geometry).
//
// 2026-07-31 retune — "slow it down".
//
// First, the diagnosis: the physics were NOT frame-coupled. kit/loop.js already
// runs a fixed 1/120 s step, and every term below is an acceleration, a
// velocity, or a per-second rate applied as pow(k, dt). The game was simply
// tuned hot — it inherited the kit's global gravity of 1600 px/s², which is
// sized for games where the player falls a screen height in well under a
// second, and a pendulum reads that as "everything happens faster than I can
// look at it".
//
// So the fix is a real time-scale, not a fudge. Under a time scale s,
// velocities scale by s and accelerations by s²; geometry is untouched, so the
// course still reads the same, it just plays slower. Hence:
//   gravity     1600 → 640 (0.40 = 0.63²) at the start, ramping to 960 at the
//               vault (0.60 = 0.77²) — the ramp IS the difficulty curve
//   startSpeed  620 → 395   and   knockVy 300 → 210   (velocities, so s not s²)
//   grabRadius  150 → 130   because a pendulum's period is 2π√(L/g): cutting g
//               alone would have stretched the swing to treacle
//
// Measured against the previous build over 40 generated courses with an
// identical scripted player: world scroll fell from 379 px/s to 273 px/s, i.e.
// 72% of the old speed — inside the 65–75% target.
//
// Second-order consequence, and the one that is easy to miss: a 72%-speed world
// covering the same 24 000 px course would need ~1.4× the session, blowing the
// 120 s cap. The course was therefore shortened in pixels (pxPerMeter 12 → 9)
// so a full run still costs roughly the same slice of the clock it always did —
// ~66 s of a 110 s session, against ~63 s of 105 s before.
//
// Shared constants (input buffer) still come from the kit: src/kit/config.js
// BALANCE. Gravity and terminal velocity are the two values this game now
// overrides locally, for the reason above.

/* ─── Palette ─────────────────────────────────────────────
   Brand anchors: BLUE #003DA6, ORANGE #F26522, GREEN #28A745.

   Identity: DUSK SKYLINE. Where the other games in the repo sit on flat navy or
   daylight fields, this one is a city at last light — a deep blue night at the
   top of the frame falling into a burning orange horizon, with chevron-roofed
   towers in silhouette. The shape language is the HEXAGON (beacons, chips,
   risk mines, the vault gate) cut with CHEVRONS (roofs, cape, progress marks).
   Nothing here is a plain rectangle or a plain circle. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#2C7BEF',
  brandBlueGlow: 'rgba(44,123,239,0.55)',
  orange: '#F26522',
  orangeLt: '#FF9152',
  orangeDeep: '#8C3208',
  green: '#28A745',
  greenLt: '#4ADE80',

  // Signature accent: sunset amber. Reads as "gold" for value without being the
  // yellow coin-gold every other game in the repo uses.
  gold: '#FFB020',
  goldLt: '#FFE0A3',
  goldDeep: '#7A4A05',

  // Hazard: crimson risk mine. Green is reserved for milestones here, so the
  // threat had to move off it.
  virus: '#FF3B4E',
  virusCore: '#3F0610',
  virusLt: '#FF9AA5',

  danger: '#EF4444',
  bgDark: '#04091C',

  // Dusk sky ramp: night → dusk blue → ember → sunset.
  skyTop: '#04091C',
  skyMid: '#0C2352',
  skyDusk: '#2E3E7C',
  skyBand: '#C2551F',
  skyHorizon: '#5A1E08',

  towerFarTop: '#1B4079',
  towerFarBot: '#0A1A3C',
  towerFarRim: 'rgba(255,176,32,0.30)',
  towerNearTop: '#08132E',
  towerNearBot: '#01040E',
  towerNearRim: 'rgba(242,101,34,0.42)',
  windowLit: 'rgba(255,193,84,0.75)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.06)',
  glassLine: 'rgba(255,255,255,0.14)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Trailing `// was N` comments mark every value the 2026-07-31 slow-down
   touched, so the previous balance can be reconstructed without git. */
export const GAME_CONFIG = {
  sessionSeconds: 110,          // was 105 — inside the 60–120 s cap
  // A 73%-speed world needs a shorter course or the same 2000 m no longer fits
  // in a legal session. Metres are the narrative unit (the milestones are named
  // life events), so the course was shortened in PIXELS instead: 2000 m is now
  // 18 000 px rather than 24 000 px.
  pxPerMeter: 9,                // was 12
  goalMeters: 2000,
  milestones: [
    { m: 200, label: 'Graduation' },
    { m: 500, label: 'First Job' },
    { m: 900, label: 'Marriage' },
    { m: 1400, label: 'Home' },
    { m: 2000, label: 'Retirement' },
  ],

  /* Per-game gravity. The kit's global 1600 px/s² is tuned for games where the
     player falls a screen height in under a second; a pendulum game inherits it
     as "everything happens twice as fast as you can read it".

     gravityStart → gravityEnd lerps on course progress (player.x / courseLen),
     which is the difficulty ramp: the swing period shortens from 2.8 s to 2.3 s
     across the run, so the opening is readable and the last third is not. It
     stacks with the three other ramps — widening gaps, rising hazard density,
     and beacons that start swaying past 750 m. */
  physics: {
    gravityStart: 640,          // was 1600 (kit BALANCE.physics.gravity)
    gravityEnd: 960,            // was 1600 — ramp target at the vault
    terminalVelocity: 1700,     // was 2400 (kit)
  },

  rope: {
    minLen: 78,                 // was 90
    maxLen: 210,                // was 260
    // Base reach. A grab inside this radius is the "clean" grab and is what the
    // beacon highlight shows. Shortened with gravity so the pendulum period
    // (2π√(L/g)) did not balloon when g came down.
    grabRadius: 130,            // was 150
    // Grab assist. While the guardian is FALLING — the moment a run is actually
    // lost — the rope reaches this much further.
    grabAssistPx: 120,
    // Angular damping, applied PER SECOND: omega *= pow(damping, dt).
    // A slower game spends more seconds per swing, so the same per-second rate
    // drains more energy per cycle than it used to. Nudged up to compensate.
    damping: 0.997,             // was 0.995
    releaseBoost: 1.065,        // was 1.06 — same net gain/cycle as before
    // -- presentation / guard rails --------------------------------------
    // Perfect Release window: swinging forward through the low arc.
    perfectThetaMin: -0.5,
    perfectThetaMax: -0.1,
    // Blocks an instant re-grab of the anchor just released.
    regrabLockSeconds: 0.18,    // was 0.15
    // Tether whips from slack to taut over this window when a grab lands.
    snapSeconds: 0.1,           // was 0.08
    sagPx: 22,                  // was 26
  },

  anchors: {
    startGapPx: 240,            // was 260 — gentler opening
    endGapPx: 430,              // was 420 — steeper finish
    swayAfterMeters: 750,       // was 900 — ramp bites earlier
    swayAmpPx: 30,              // was 26
    swayHz: 0.3,                // was 0.35 — slower world, slower sway
    // -- world generation --------------------------------------------------
    firstX: 300,
    baseY: 180,
    jitterPx: 52,               // was 60
    pylonR: 17,                 // hex beacon radius (was pylonW 34 / pylonH 22)
  },

  hazards: {
    startPer1000px: 1.05,       // was 1.2
    endPer1000px: 3.6,          // was 2.6 — the slower start has to end harder
    radius: 22,
    // -- placement + consequence ------------------------------------------
    // Band straddling the ideal flight arc. Shifted up a touch: the shorter
    // rope raises the release point, so the arc now sits higher in the frame.
    minY: 226,                  // was 230
    maxY: 368,                  // was 380
    spreadFrac: 0.34,
    knockVy: 210,               // was 300 (velocity, scales with s not s²)
    grabLockoutSeconds: 0.55,   // was 0.5
    pulseHz: 1.25,              // was 1.6
    spikes: 6,                  // was 12 — one chevron per hex face
  },

  pickups: {
    coinValue: 25,
    milestoneValue: 300,
    perfectReleaseValue: 50,
    shieldRadius: 20,
    coinRadius: 14,
    // -- world generation --------------------------------------------------
    coinsPerGap: 3,
    coinArcRisePx: 52,          // was 60
    // × grabRadius below the anchor. Raised so the absolute drop stays ~120 px
    // even though grabRadius fell from 150 to 130.
    coinLaneDrop: 0.92,         // was 0.8
    shieldEveryPx: 600,
    shieldY: 262,
  },

  player: {
    radius: 16,
    // Must satisfy (startY - anchors.baseY) < rope.grabRadius, or the opening
    // acos() clamps to 1 and the guardian starts hanging dead-still.
    startY: 300,                // was 320
    // Opening impulse. The run is a conservative system topped up by
    // releaseBoost, so this is the seed capital: from rest the guardian could
    // never rise back to beacon height.
    startSpeed: 395,            // was 620 (velocity, scales with s)
  },

  camera: {
    // Player sits this fraction across the screen; damp() lambda for the follow.
    followFrac: 0.35,
    lambda: 3.4,                // was 4 — softer follow suits the slower world
  },

  world: {
    // Falling past (logical height + this) ends the run.
    floorMarginPx: 60,
    // Pre-built parallax layers are this wide and tile seamlessly.
    backdropTilePx: 760,        // was 720 — matches the tower pitch
    parallaxFar: 0.18,          // was 0.22
    parallaxNear: 0.48,         // was 0.55
    // Entities scale-bounce in over this window as they enter view.
    spawnPopSeconds: 0.3,       // was 0.26
    dangerBandPx: 110,
    // -- dusk backdrop -----------------------------------------------------
    horizonFrac: 0.78,
    sunXFrac: 0.72,
    sunYFrac: 0.74,
    sunRadiusPx: 132,
    towerPitchFar: 96,
    towerPitchNear: 132,
  },

  fx: {
    damageShake: 5,
    hitStopSeconds: 0.09,
    coinParticles: 10,
    shieldParticles: 14,
    perfectParticles: 12,
    hitParticles: 18,
    milestoneParticles: 22,
    winParticles: 40,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle. */
export const RESULT_TARGET_SCORE = 4000;
