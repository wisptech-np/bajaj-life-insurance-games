// data.js — Risk Slash tunables. Every number the game reads lives here.
//
// Concept: green risk orbs (labelled financial hazards) are lobbed up in arcs;
// swipe to slash them. Blue Family Shield orbs must NOT be sliced — they are
// this game's "bombs". Cover is the blade: cut the risks out of the family's
// life before the horn.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  blueLt: '#7FC0FF',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  greenLt: '#5FE07A',
  greenDeep: '#0E5C1D',
  goo: '#3ECB5B',
  gooDeep: '#177A32',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  bgDark: '#0B1221',
  bgTop: '#071026',
  bgMid: '#0d1e3f',
  bgLow: '#0a1730',
};

// The six risk archetypes. Icons are Path2D silhouettes (see sprites in
// RiskSlashGame.jsx) — no emoji, no images. `hue` tints the spiky orb so the
// six read apart at a glance; all stay in the green "hazard" family.
export const RISK_TYPES = [
  { id: 'scam', label: 'SCAM CALL', icon: 'phone', hue: '#49E24B', hueDeep: '#0E5C1D' },
  { id: 'fees', label: 'HIDDEN FEES', icon: 'percent', hue: '#3ECB5B', hueDeep: '#115C26' },
  { id: 'debt', label: 'DEBT TRAP', icon: 'weight', hue: '#63D14B', hueDeep: '#1E5C0E' },
  { id: 'inflation', label: 'INFLATION', icon: 'arrow', hue: '#8FDD4A', hueDeep: '#3D5C0E' },
  { id: 'medical', label: 'MEDICAL BILL', icon: 'cross', hue: '#2FBF6B', hueDeep: '#0E5C33' },
  { id: 'impulse', label: 'IMPULSE BUY', icon: 'bag', hue: '#55E28F', hueDeep: '#0F4D2E' },
];

export const GAME_CONFIG = {
  // ---- Session ------------------------------------------------------------
  sessionSeconds: 90,
  targetScore: 120,          // WIN: score >= target at the horn
  endBeatMs: 900,            // beat between the on-screen ending and results

  // ---- Launch physics (logical px, px/s, px/s^2) --------------------------
  physics: {
    gravity: 1500,
    apexMinFrac: 0.70,       // apex sits at 70–85% of stage height (from the floor)
    apexMaxFrac: 0.85,
    launchBandFrac: 0.80,    // launch x across the middle 80% of the width
    inwardAngle: 0.42,       // horizontal speed toward centre as a fraction of |vy| at most
    inwardJitter: 0.10,      // ± random fraction of |vy| on top of the inward pull
    spinMax: 1.6,            // rad/s idle tumble on airborne orbs
    volleyStaggerMs: 110,    // gap between orbs inside one volley
  },

  // ---- Orbs ---------------------------------------------------------------
  orb: {
    radiusFrac: 0.085,       // sprite radius as a fraction of stage width
    radiusMin: 24,
    radiusMax: 38,
    hitboxMult: 1.15,        // near-misses hit; misses feel earned
    maxAirborne: 14,         // hard cap on simultaneous orbs (pool size guard)
  },

  // ---- Blade --------------------------------------------------------------
  blade: {
    minSliceSpeed: 400,      // px/s — slower dragging cuts nothing (anti-exploit)
    trailWindowMs: 150,      // pointer positions kept for slice testing
    fadeMs: 200,             // ribbon fades out over this long
    maxPoints: 24,           // ring buffer size (~8–12 live points at 60Hz input)
    maxSlicesPerGesture: 8,  // cap per continuous gesture
    comboGapMs: 300,         // max gap between slices inside one combo
    comboMin: 3,             // 3+ risks in one gesture = "N-RISK COMBO"
    widthMax: 13,            // ribbon width at the head (tapers to 0 at the tail)
  },

  // ---- Scoring ------------------------------------------------------------
  scoring: {
    risk: 1,                 // per risk sliced
    comboBonusPerExtra: 2,   // combo bonus = 2 × (N − 2)
    shieldPenalty: -10,      // slicing a Family Shield
  },

  // ---- Family Shield orbs -------------------------------------------------
  shields: {
    loseAfter: 3,            // 3 shields sliced = early LOSE
    stunSeconds: 1.0,        // white-flash stun after slicing one (input dead)
    telegraphMs: 200,        // puff at the launch point before a shield goes up
    chimeEverySeconds: 0.8,  // soft chime while any shield is airborne
    // Fairness: enforced minimum path separation between a shield and every
    // risk orb over their shared airtime, in multiples of combined radii.
    minSeparationMult: 1.2,
    separationSampleDt: 0.06,
    separationRetries: 12,   // re-roll the shield launch this many times, else drop it
  },

  // ---- Session ramp (phase `until` is seconds into the run) --------------
  ramp: [
    { until: 15, interval: 1.6, min: 1, max: 2, shieldChance: 0 },
    { until: 45, interval: 1.2, min: 2, max: 4, shieldChance: 0.10 },
    { until: 75, interval: 0.9, min: 3, max: 5, shieldChance: 0.18 },
    { until: 90, interval: 0.9, min: 3, max: 5, shieldChance: 0, finale: true },
  ],

  // ---- Fever / Frenzy -----------------------------------------------------
  frenzy: {
    seconds: 4,              // mid-run frenzy length
    spawnRateMult: 3,        // spawn ×3 (interval ÷ 3), zero shields, warm tint
    comboMeter: 10,          // risks sliced without a shield hit to trigger
    everySeconds: 30,        // ...or roughly every 30s regardless
  },

  // ---- Slow-mo moment -----------------------------------------------------
  slowmo: {
    minSlicesOneSwipe: 5,    // slicing 5+ in one swipe triggers it
    seconds: 1.0,
    scale: 0.25,             // 0.25× world speed
    zoom: 1.05,              // slight punch-in while it runs
  },

  // ---- Juice --------------------------------------------------------------
  fx: {
    halfFlySpeedMin: 80,     // orb halves fly apart perpendicular to the cut
    halfFlySpeedMax: 150,
    halfSpinMax: 3,          // ± rad/s random spin on each half
    halfLifeSeconds: 1.4,
    gooParticles: 12,        // per slice burst
    splatLifeSeconds: 3.5,   // background stain fade
    splatMax: 10,
    shieldShake: 8,          // screen shake on shield-slice
    winParticles: 26,
    loseParticles: 18,
    bannerSeconds: 1.4,
    labelFadeMs: 260,
  },

  // ---- HUD / anti-pause-scum ---------------------------------------------
  hud: {
    lowTimeSeconds: 15,
    // The kit loop auto-pauses on visibilitychange and resumes at the frozen
    // state — exploitable in a reaction game. On resume the world stays frozen
    // behind a visible 3-2-1 re-acquire count with the session clock held,
    // then runs briefly with input still refused so pausing is never free.
    // Pattern copied from goal-juggler (repo-wide rule).
    reacquireFreezeSeconds: 1.5,
    reacquireLockSeconds: 0.25,
  },
};
