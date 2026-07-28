// data.js — Swing to Secure tunables.
//
// Every number a designer would want to retune lives here. SwingToSecureGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph geometry).
//
// Physics constants that are shared across every game in the repo (gravity,
// terminal velocity, input buffer) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221. */
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
  skyMid: '#0A2E62',
  skyLow: '#12508F',
  rockFarTop: '#22456F',
  rockFarBot: '#132A4A',
  rockNearTop: '#0C1E3B',
  rockNearBot: '#050C1A',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   The first block is the balance sheet agreed in the design spec. The blocks
   below it (`camera`, `world`, `fx`, `hud`) are presentation tunables that the
   same designer would reach for, kept here rather than buried in the component. */
export const GAME_CONFIG = {
  sessionSeconds: 105,
  pxPerMeter: 12,
  goalMeters: 2000,
  milestones: [
    { m: 200, label: 'Graduation' },
    { m: 500, label: 'First Job' },
    { m: 900, label: 'Marriage' },
    { m: 1400, label: 'Home' },
    { m: 2000, label: 'Retirement' },
  ],
  rope: {
    minLen: 90,
    maxLen: 260,
    // Base reach. A grab inside this radius is the "clean" grab and is what the
    // pylon highlight shows.
    grabRadius: 150,
    // Grab assist. While the guardian is FALLING — the moment a run is actually
    // lost — the rope reaches this much further. Without it the game cannot be
    // finished: a pendulum hung 180 px up with a 150 px reach leaves a grab
    // window only ~50 px wide once you are 140 px below the pylon, and the
    // course was measured (see README "Balance notes") as unwinnable by an
    // optimal player. 150 + 120 also makes `maxLen` meaningful for the first
    // time, since a grab can now land beyond 260 px.
    grabAssistPx: 120,
    // Angular damping, applied PER SECOND: omega *= pow(damping, dt).
    // Applying it once per fixed 1/120 s step instead compounds to ~0.55x per
    // second, which drains the swing faster than releaseBoost can pump it and
    // makes the vault mathematically unreachable. kit/loop.js documents this
    // class of bug; kit/effects.js uses the same pow(k, dt) idiom for drag.
    damping: 0.995,
    releaseBoost: 1.06,
    // -- presentation / guard rails --------------------------------------
    // Perfect Release window: swinging forward through the low arc.
    perfectThetaMin: -0.5,
    perfectThetaMax: -0.1,
    // Blocks an instant re-grab of the anchor just released, which would
    // otherwise let a held pointer farm releaseBoost on a single anchor.
    regrabLockSeconds: 0.15,
    // Rope whips from slack to taut over this window when a grab lands.
    snapSeconds: 0.08,
    sagPx: 26,
  },
  anchors: {
    startGapPx: 260,
    endGapPx: 420,
    swayAfterMeters: 900,
    swayAmpPx: 26,
    swayHz: 0.35,
    // -- world generation --------------------------------------------------
    firstX: 300,
    baseY: 180,
    jitterPx: 60,
    pylonW: 34,
    pylonH: 22,
  },
  hazards: {
    startPer1000px: 1.2,
    endPer1000px: 2.6,
    radius: 22,
    // -- placement + consequence ------------------------------------------
    // Band straddling the ideal flight arc. Placed lower (300-430) the orbs sit
    // under every sane trajectory and are never hit at all; this band forces a
    // line change, and the coin-clash filter in buildWorld keeps an orb from
    // ever sitting on top of a coin.
    minY: 230,
    maxY: 380,
    spreadFrac: 0.34,
    knockVy: 300,
    grabLockoutSeconds: 0.5,
    pulseHz: 1.6,
    spikes: 12,
  },
  pickups: {
    coinValue: 25,
    milestoneValue: 300,
    perfectReleaseValue: 50,
    shieldRadius: 20,
    coinRadius: 14,
    // -- world generation --------------------------------------------------
    coinsPerGap: 3,
    coinArcRisePx: 60,
    coinLaneDrop: 0.8, // × grabRadius below the anchor: the arc endpoints
    shieldEveryPx: 600,
    shieldY: 262,
  },
  player: {
    radius: 16,
    startY: 320,
    // The guardian opens the run already swinging on the first pylon at this
    // speed. Starting from rest is a guaranteed loss: a pendulum released at
    // y=320 can never rise above y=320, so it can never reach the next pylon.
    startSpeed: 620,
  },

  camera: {
    // Player sits this fraction across the screen; damp() lambda for the follow.
    followFrac: 0.35,
    lambda: 4,
  },

  world: {
    // Falling past (logical height + this) ends the run.
    floorMarginPx: 60,
    // Pre-built parallax layers are this wide and tile seamlessly.
    backdropTilePx: 720,
    parallaxFar: 0.22,
    parallaxNear: 0.55,
    // Entities scale-bounce in over this window as they enter view.
    spawnPopSeconds: 0.26,
    dangerBandPx: 110,
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
    bannerSeconds: 1.8,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle. */
export const RESULT_TARGET_SCORE = 4000;
