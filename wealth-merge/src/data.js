// data.js — Wealth Merge tunables.
//
// Every number a designer would want to retune lives here. WealthMergeGame.jsx
// and the pure module src/physics.js read from this file (physics.js takes it
// as a PARAMETER — it never imports it) and never hard-code gameplay values;
// the only constants in the component are drawing details (stroke widths,
// emblem proportions).
//
// Feel constants shared with every other game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar. Gold climbs the ladder — the further up a tier, the warmer
   and brighter its metal reads, ending at the white-gold Retirement Corpus.
   RED belongs exclusively to the overflow line and its countdown, so anything
   red on screen means the jar is in danger. WHITE is the player's own touch
   (the aim guide and ghost landing spot). */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
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
  skyTop: '#08152F',
  skyMid: '#0C2A57',
  skyLow: '#061229',

  jarWall: 'rgba(150,190,240,0.35)',
  jarWallLit: 'rgba(190,220,255,0.65)',
  jarGlass: 'rgba(120,170,240,0.05)',
  guide: 'rgba(255,255,255,0.55)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── The 8-tier wealth ladder ────────────────────────────
   Radius grows ~×1.35 per tier. Two same-tier tokens in contact merge into
   one of the next tier — small savings compounding into life goals, ending
   at the Retirement Corpus. Every sprite is layered programmatic canvas
   (gradients, rim light, gloss) — no emoji, no image files.

   `score` is the triangular number for the CREATED tier (1,3,6,10,15,21,28,36),
   multiplied by the live chain multiplier at merge time. `pitch` is the
   semitone offset of the pop voice so bigger merges ring higher even before
   the chain raises them further. */
export const TIERS = [
  {
    key: 'coin', label: 'Coin', emblem: 'rupee', radius: 12, score: 1, pitch: 0,
    color: '#FFD25E', colorLt: '#FFEcA8', colorDeep: '#9A6B0A', glow: 'rgba(255,210,94,0.45)',
  },
  {
    key: 'stack', label: 'Coin Stack', emblem: 'stack', radius: 16, score: 3, pitch: 1,
    color: '#FFC845', colorLt: '#FFE38A', colorDeep: '#8F6206', glow: 'rgba(255,200,69,0.45)',
  },
  {
    key: 'ingot', label: 'Gold Ingot', emblem: 'ingot', radius: 22, score: 6, pitch: 2,
    color: '#F2A93B', colorLt: '#FFD98E', colorDeep: '#8A5104', glow: 'rgba(242,169,59,0.45)',
  },
  {
    key: 'piggy', label: 'Piggy Bank', emblem: 'piggy', radius: 30, score: 10, pitch: 3,
    color: '#FF8A3D', colorLt: '#FFC59B', colorDeep: '#8C3708', glow: 'rgba(255,138,61,0.5)',
  },
  {
    key: 'sip', label: 'SIP Jar', emblem: 'jar', radius: 40, score: 15, pitch: 4,
    color: '#4ADE80', colorLt: '#A9F5C6', colorDeep: '#106B36', glow: 'rgba(74,222,128,0.5)',
  },
  {
    key: 'shield', label: 'Gold Shield', emblem: 'shield', radius: 54, score: 21, pitch: 5,
    color: '#5FA8FF', colorLt: '#B6D9FF', colorDeep: '#0B3D82', glow: 'rgba(95,168,255,0.55)',
  },
  {
    key: 'home', label: 'Home', emblem: 'home', radius: 72, score: 28, pitch: 6,
    color: '#F26522', colorLt: '#FFB088', colorDeep: '#7A2E06', glow: 'rgba(242,101,34,0.55)',
  },
  {
    key: 'corpus', label: 'Retirement Corpus', emblem: 'vault', radius: 96, score: 36, pitch: 8,
    color: '#FFE066', colorLt: '#FFF6C9', colorDeep: '#A87A08', glow: 'rgba(255,224,102,0.75)',
  },
];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/physics.js. */
export const GAME_CONFIG = {
  /** Hard session length, seconds. */
  sessionSeconds: 100,

  /** Score needed at the final whistle (the timer-end win path). Creating the
      tier-8 Retirement Corpus wins immediately regardless of this number.
      Idling can never win: the win requires the target, not mere survival. */
  targetScore: 300,

  /* -- Playfield geometry (logical px; the canvas scales uniformly) -------- */
  field: {
    /** Logical play-space. Taller than wide, per the jar concept. */
    W: 360,
    H: 480,
    /** Jar wall inner faces. */
    wallLeft: 14,
    wallRight: 346,
    /** Jar floor (inner face) and the open top of the jar interior. */
    floorY: 466,
    jarTopY: 74,
    /** Y at which the held piece hangs while aiming. */
    dropY: 40,
    /** Danger line: 18% down from the jar's open top. A resting token whose
        top edge sits above this line starts the overflow countdown. */
    dangerFrac: 0.18,
  },

  /* -- Physics (hand-rolled circles) ---------------------------------------
     Deliberately arcade: heavy gravity plus strong damping so the pile
     settles within ~2 s of a drop. Deterministic — the only impulse not
     produced by the integrator is the fixed merge pop. */
  physics: {
    gravity: 1500,
    restitution: 0.15,
    friction: 0.4,
    /** Linear damping per second (v *= e^(-damping·dt)). */
    linearDamping: 0.6,
    /** Extra damping applied to slow tokens so stacks go still. */
    settleDamping: 6.0,
    /** Below this speed a token counts as "at rest" (px/s). */
    restSpeed: 20,
    /** Solver iterations per fixed 120 Hz kit step (2 kit steps = one 60 Hz
        frame with 2 substeps; iterations stabilise tall stacks). */
    solverIterations: 4,
    /** Positional correction: fraction of penetration removed per iteration,
        and the slop tolerated before correction kicks in. */
    correctionPercent: 0.8,
    correctionSlop: 0.4,
    /** Hard speed ceiling, px/s. */
    maxSpeed: 1600,
  },

  /* -- Dropping ------------------------------------------------------------ */
  drop: {
    /** Droppable tiers (indices into TIERS) and their base weights 4:3:2:1. */
    tiers: [0, 1, 2, 3],
    weights: [4, 3, 2, 1],
    /** After this many seconds the weights shift toward tiers 2–4 so the jar
        fills faster in the late game. */
    lateShiftSeconds: 40,
    lateWeights: [1, 3, 3, 2],
    /** Next piece becomes available this long after a release, ms → s. */
    respawnSeconds: 0.4,
    /** Anti-stall: a held piece auto-drops after this long. */
    autoDropSeconds: 5.0,
  },

  /* -- Merging ------------------------------------------------------------- */
  merge: {
    /** Contact tolerance for a merge test, px beyond touching. */
    contactEpsilon: 1.5,
    /** Fixed upward pop given to the newly created token, px/s. */
    popImpulse: 130,
    /** Fixed outward jostle applied to tokens overlapping the new bigger
        token — this is what sets off chain cascades. */
    jostleImpulse: 90,
    /** A token must be at least this old (s) before it can merge, so a piece
        cannot merge in the same instant it spawns. */
    minAgeSeconds: 0.05,
  },

  /* -- Chains ---------------------------------------------------------------
     A merge within `windowSeconds` of the previous merge deepens the chain.
     Multiplier ladder ×1, ×1.5, ×2, ×3, then +1 per further step. */
  chain: {
    windowSeconds: 1.0,
    multipliers: [1, 1.5, 2, 3, 4, 5, 6, 7, 8],
  },

  /* -- Overflow (the loss line) ---------------------------------------------
     Game over ONLY when a token's top edge stays above the danger line while
     at rest (speed < physics.restSpeed, age > restAgeSeconds) continuously
     for graceSeconds. A transient bounce never loses the run; the grace
     window is the last-second merge-out comeback. */
  overflow: {
    graceSeconds: 2.0,
    restAgeSeconds: 0.5,
  },

  /* -- Pause / re-acquire (anti pause-scum) ---------------------------------
     The kit auto-pauses on visibilitychange and the kit is immutable, so the
     rule lives in physics.js: resuming from an auto-pause holds the world AND
     the session clock behind a visible 3-2-1 count, then refuses input for a
     short live beat. See physics.js beginPause/endPause. */
  hud: {
    lowTimeSeconds: 15,
    reacquireFreezeSeconds: 1.5,
    reacquireLockSeconds: 0.25,
  },

  fx: {
    mergeParticles: 12,
    bigMergeParticles: 22,
    dropParticles: 6,
    winParticles: 40,
    loseParticles: 26,
    /** Screen shake only on tier-6+ merges (created tier index >= 5). */
    shakeMinTier: 5,
    mergeShake: 7,
    landWobbleSpeed: 140,
    squashSeconds: 0.28,
    bannerSeconds: 1.5,
    /** Beat between the run ending on screen and the results screen. */
    endBeatMs: 900,
  },
};

/** Score the Results ring treats as a full circle — a presentation stretch
    line above the 300-point win target, not the win condition. */
export const RESULT_TARGET_SCORE = 600;
