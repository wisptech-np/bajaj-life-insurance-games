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

   Colour grammar — three exclusive jobs, so no colour ever means two things.

   1. VALUE (the tokens) climbs a four-band metal ladder, the same rank order
      every loyalty programme and every card tier already taught the player:
      COPPER/BRONZE → GOLD → PLATINUM → DIAMOND. Body luminance rises strictly
      with tier (0.10 → 0.97 relative luminance), chroma peaks in the gold band
      and then drains out to white, and the brand hues arrive only at the top
      as gem inlays: brand BLUE at tier 6 (protection), brand ORANGE at tier 7
      (the home), warm white-gold at tier 8. See TIERS below.
   2. DANGER is RED, and only red — the overflow line, its countdown, its
      alarm wash. Anything red on screen means the jar is about to lose.
   3. The PLAYER'S OWN TOUCH is white — the aim guide and the ghost landing
      ring. Nothing else in the scene is pure neutral white.

   Because value is carried by luminance rather than hue, the ladder still
   ranks correctly in greyscale and for colour-blind players. */
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
  platinum: '#C9D8E6',
  platinumLt: '#EAF3FF',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  skyTop: '#08152F',
  skyMid: '#0C2A57',
  skyLow: '#061229',
  /** Warm bloom rising off the money at the bottom of the jar. */
  bloomWarm: 'rgba(176,123,18,0.26)',
  /** Cool bloom behind the jar mouth. */
  bloomCool: 'rgba(30,107,224,0.22)',

  jarWall: 'rgba(150,190,240,0.35)',
  jarWallLit: 'rgba(190,220,255,0.65)',
  jarGlass: 'rgba(120,170,240,0.05)',
  guide: 'rgba(255,255,255,0.55)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  /** Engraved ink used on the light metals — dark navy, never pure black. */
  inkDeep: '#0A1A31',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── The 8-tier wealth ladder ────────────────────────────
   Two same-tier tokens in contact merge into one of the next tier — loose
   change compounding into a retirement corpus. Every sprite is layered
   programmatic canvas (see src/sprites.js) — no emoji, no image files.

   THE RANKING CONTRACT. A player must be able to rank two tokens by value
   from a still frame, so SIX independent channels all climb together and none
   of them ever goes backwards (asserted by scripts/tier-ladder.mjs):

     radius   12 → 96   size
     color    L 0.10 → 0.97   body luminance (copper → bronze → gold → rich
                              gold → platinum → sapphire-platinum → white gold
                              → radiant)
     glowPx   0 → 34    how far the token throws light; the base metals throw
                        none at all, the top of the ladder is a lamp
     pips     1 → 8     rim studs — a literal countable rank, readable at 12 px
     facets   0 → 16    brushed-metal streak density; detail equals craft
     alive    0 → 3     orbiting light motes. Tiers 1–5 are inert objects,
                        tiers 6–8 are animated: money that is working.

   `band` names the material class (2 tiers each) and drives the sheen:
   'copper' and 'gold' are warm polished metal, 'platinum' is cool brushed
   metal, 'radiant' is lit from within. `ink` is the emblem colour and flips
   from white to deep navy at the gold band: base metal is STAMPED (a light
   mark punched into a dark blank), precious metal is ENGRAVED (a dark mark cut
   into bright metal). That is both the cheaper/dearer read and the only way to
   keep the emblem above 3:1 contrast on a body as bright as #FFC845 —
   scripts/tier-ladder.mjs fails the build-gate check if it ever drops below.
   `gem` is the inlaid brand colour at the top of the ladder, `null` below it.

   `score` is the triangular number for the CREATED tier (1,3,6,10,15,21,28,36),
   multiplied by the live chain multiplier at merge time — unchanged, so merge
   pacing and the 300-point target are exactly as balanced before. `pitch` is
   the semitone offset of the pop voice so bigger merges ring higher even
   before the chain raises them further. `sub` is the one-line meaning shown on
   the reward banner: what this rung of the ladder is in a real financial life. */
export const TIERS = [
  {
    key: 'coin', label: 'Rupee Coin', sub: 'Loose change', emblem: 'rupee',
    radius: 12, score: 1, pitch: 0,
    band: 'copper', color: '#A25A2C', colorLt: '#D9955F', colorDeep: '#48210A',
    glow: 'rgba(217,149,95,0.35)', glowPx: 0, pips: 1, facets: 0, alive: 0,
    ink: 'rgba(255,255,255,0.95)', gem: null,
  },
  {
    key: 'stack', label: 'Coin Stack', sub: 'You started saving', emblem: 'stack',
    radius: 16, score: 3, pitch: 1,
    band: 'copper', color: '#C4821B', colorLt: '#EFBE66', colorDeep: '#5C380B',
    glow: 'rgba(239,190,102,0.38)', glowPx: 3, pips: 2, facets: 4, alive: 0,
    ink: 'rgba(255,255,255,0.95)', gem: null,
  },
  {
    key: 'piggy', label: 'Piggy Bank', sub: 'Saving is a habit', emblem: 'piggy',
    radius: 22, score: 6, pitch: 2,
    band: 'gold', color: '#E3A82A', colorLt: '#FFD87A', colorDeep: '#6E4A05',
    glow: 'rgba(255,216,122,0.44)', glowPx: 6, pips: 3, facets: 6, alive: 0,
    ink: '#0A1A31', gem: null,
  },
  {
    key: 'reserve', label: 'Gold Reserve', sub: 'You own an asset', emblem: 'ingot',
    radius: 30, score: 10, pitch: 3,
    band: 'gold', color: '#FFC845', colorLt: '#FFE9A8', colorDeep: '#8A5D04',
    glow: 'rgba(255,200,69,0.50)', glowPx: 10, pips: 4, facets: 9, alive: 0,
    ink: '#0A1A31', gem: null,
  },
  {
    key: 'sip', label: 'SIP Growth', sub: 'Money that compounds', emblem: 'growth',
    radius: 40, score: 15, pitch: 4,
    band: 'platinum', color: '#C9D8E6', colorLt: '#F2F8FF', colorDeep: '#4A6480',
    glow: 'rgba(201,216,230,0.55)', glowPx: 15, pips: 5, facets: 11, alive: 0,
    ink: '#0A1A31', gem: null,
  },
  {
    key: 'shield', label: 'Protection Plan', sub: 'Your wealth is insured', emblem: 'shield',
    radius: 54, score: 21, pitch: 5,
    band: 'platinum', color: '#DCE8F4', colorLt: '#FFFFFF', colorDeep: '#4C6D96',
    glow: 'rgba(30,107,224,0.60)', glowPx: 21, pips: 6, facets: 13, alive: 1,
    ink: '#0A1A31', gem: '#1E6BE0',
  },
  {
    key: 'home', label: 'Family Home', sub: 'A life goal, funded', emblem: 'home',
    radius: 72, score: 28, pitch: 6,
    band: 'radiant', color: '#F7EBDA', colorLt: '#FFFFFF', colorDeep: '#B79263',
    glow: 'rgba(242,101,34,0.62)', glowPx: 27, pips: 7, facets: 14, alive: 2,
    ink: '#0A1A31', gem: '#FF8A3D',
  },
  {
    key: 'corpus', label: 'Retirement Corpus', sub: 'Financial freedom', emblem: 'vault',
    radius: 96, score: 36, pitch: 8,
    band: 'radiant', color: '#FFFDF0', colorLt: '#FFFFFF', colorDeep: '#B07B12',
    glow: 'rgba(255,224,102,0.80)', glowPx: 34, pips: 8, facets: 16, alive: 3,
    ink: '#0A1A31', gem: '#FFE38A',
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

    /* -- Merge shockwave ring ---------------------------------------------
       A ring of light fired at the contact point, sized and timed by the
       tier that was created, so the reward reads bigger the further up the
       ladder the merge landed. A second inner ring is added from
       `doubleRingTier` up. Rings are a fixed local pool — see the game
       component; they never allocate. */
    ring: {
      /** Radius the ring reaches, as a multiple of the created token radius. */
      spread: 3.0,
      /** Seconds the ring takes to expand and fade; +growth per tier index. */
      life: 0.36,
      lifePerTier: 0.035,
      width: 3.2,
      widthPerTier: 0.55,
      doubleRingTier: 3,
    },
    /** Squash-pop depth of a newly merged token: base + per-tier, so a
        Retirement Corpus lands with visibly more weight than a coin stack. */
    popSquash: 0.16,
    popSquashPerTier: 0.028,
    /** Orbit speed (rad/s) of the light motes on the `alive` top tiers. */
    orbitSpeed: 1.15,
  },
};

/** Score the Results ring treats as a full circle — a presentation stretch
    line above the 300-point win target, not the win condition. */
export const RESULT_TARGET_SCORE = 600;
