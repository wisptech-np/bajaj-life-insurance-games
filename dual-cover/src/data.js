// data.js — Dual Cover tunables.
//
// Every number a designer would want to retune lives here. DualCoverGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph proportions).
//
// The pure module src/rules.js takes this object as a PARAMETER — it never
// imports it — so gate.mjs runs the SHIPPED simulation headless against the
// SHIPPED numbers.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, bg #0B1221.

   Colour grammar. BLUE is the Protection orb and everything it leaves behind
   (trail, splat, particles); ORANGE is the Growth orb and everything IT leaves
   behind. Obstacles are cold neutral steel — they belong to the world, not to
   either orb. GOLD marks a near-miss and the shimmer streak. RED appears only
   when something is lost: the hit vignette and a spent shield. WHITE is UI. */
export const COLORS = {
  brandBlue: '#003DA6',
  blue: '#1E6BE0',
  blueLt: '#7FC0FF',
  blueDeep: '#062C6B',
  blueGlow: 'rgba(30,107,224,0.55)',

  orange: '#F26522',
  orangeLt: '#FFB27A',
  orangeBright: '#FF8A3D',
  orangeDeep: '#8C3708',
  orangeGlow: 'rgba(242,101,34,0.55)',

  green: '#28A745',
  greenLt: '#4ADE80',

  gold: '#FFC845',
  goldLt: '#FFE38A',

  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  skyTop: '#08122B',
  skyMid: '#0D2350',
  skyLow: '#060E22',

  barHi: '#D7E3F8',
  barMid: '#9FB4D8',
  barLo: '#5F749C',
  barEdge: '#EAF2FF',

  ring: 'rgba(190,214,255,0.16)',
  ringTick: 'rgba(190,214,255,0.28)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/rules.js and therefore by gate.mjs. */
export const GAME_CONFIG = {
  /** HUD cap; the authored sequence is generated to finish just inside it. */
  sessionSeconds: 90,

  /* -- Playfield geometry (logical px; the canvas scales uniformly) -------- */
  field: {
    W: 390,
    H: 780,
    cx: 195,
    cy: 480,
    ringR: 120,
    orbR: 13,
    /** Lethal band: any obstacle overlapping [bandTop, bandBot] can touch an
        orb somewhere on the ring. bandTop = cy - ringR - orbR,
        bandBot = cy + ringR + orbR. Stored, not derived, so the gate and the
        renderer agree byte-for-byte. */
    bandTop: 347,
    bandBot: 613,
  },

  /* -- Rotation feel (degrees, deg/s, deg/s²) ------------------------------
     Hold-to-rotate: holding a screen half applies angular acceleration toward
     that side, capped at maxOmega. Releasing decays omega with an 80 ms
     half-life — a surgical, near-instant stop. Both halves held = zero net
     torque (no drive; omega just decays). */
  rotation: {
    accel: 780,
    maxOmega: 330,
    releaseHalfLife: 0.08,
    /** Assist (accessibility) drag mode: degrees of rotation per px of drag. */
    dragDegPerPx: 0.55,
  },

  /* -- Descent ramp --------------------------------------------------------
     Obstacles fall at v(t), linear 330 → 470 px/s across the 90 s. The spawn
     interval is the breath between one obstacle's trailing edge crossing the
     ring centre and the next spawning at the top of the screen; it tightens
     1.7 → 1.15 s over the same ramp. */
  ramp: {
    v0: 330,
    v1: 470,
    seconds: 90,
    interval0: 1.7,
    interval1: 1.15,
  },

  /* -- Obstacle vocabulary -------------------------------------------------
     All bars are barH thick. Walls are side stubs that stop short of the ring
     centre; the centre bar leaves side gaps; the staggered gate is two stub
     walls on opposite sides gateSepPx apart; the spinner is a centre bar that
     rotates spinDeg during its descent (with a visible preview spin before it
     reaches the lethal band); the squeeze is a double bar with one off-centre
     gap that only a held 45° diagonal fits through. */
  obstacles: {
    barH: 26,
    wallLen: 140,        // side stub length → safe window vertical ±20°
    centerHalfW: 97,     // centre bar half width → safe window horizontal ±23°
    gateSepPx: 380,      // staggered gates: vertical gap between the two walls
    spinnerHalfLen: 92,
    spinDeg: 45,
    spinPreviewPx: 210,  // preview spin begins this far above the lethal band (~0.5 s)
    squeezeGapHalfW: 30, // half width of the diagonal gap
    squeezeGapDx: 85,    // gap centre offset from cx → gap sits at the 45° orb radius
    squeezeSepPx: 56,    // vertical gap between the two bars of the double bar
    /** Unlock times (s): wall/centre from 0, staggered 20, spinner 45, squeeze 70. */
    unlock: { wall: 0, center: 0, gate: 20, spinner: 45, squeeze: 70 },
  },

  /* -- Sequence generation -------------------------------------------------
     One authored ~90 s sequence (~30–36 obstacles) from the session's
     mulberry32 seed. The generator enforces the reachability constraint and
     gate.mjs proves it on ≥10 seeds. */
  sequence: {
    startDelay: 1.5,
    endTime: 90,
    /** Reachability: requiredRotationDeg / maxOmega × safetyFactor must fit in
        the gap between one obstacle leaving the band and the next entering. */
    safetyFactor: 1.6,
    maxReqDeg: 170,
    /** Never more than this many consecutive obstacles demanding the same
        orientation — variety, and what guarantees an idle player dies. */
    maxSameOrientation: 2,
    maxSameType: 2,
  },

  /* -- Hits ---------------------------------------------------------------- */
  hit: {
    shields: 3,          // 4th hit loses
    invulnSeconds: 0.9,
    hitStopSeconds: 0.06,
  },

  /* -- Scoring ------------------------------------------------------------- */
  scoring: {
    passBase: 40,
    comboGrowth: 1.1,    // ×1.1 per consecutive clean pass…
    comboCap: 3,         // …capped ×3; combo resets on hit
    nearMiss: 25,        // clearance < nearMissPx at closest approach
    nearMissPx: 10,
    phaseBonus: 150,     // per clean phase, 4 phases
    noHitFinish: 500,
    /** Near-miss streak length that starts the shimmer state. */
    zoneStreak: 5,
  },

  /** Phase boundaries (s). Four phases: [0,20) walls & bars, [20,45) +gates,
      [45,70) +spinners, [70,end] +squeeze. Each ends with a bonus if clean. */
  phases: [20, 45, 70],

  /* -- Pause / re-acquire --------------------------------------------------
     The kit auto-pauses on visibilitychange and the kit is immutable, so the
     anti-pause-scum rule lives in rules.js: resuming holds the world frozen
     behind a visible 3-2-1 count, with the clock held and input dead, and
     rewinds the obstacle field by rewindSeconds of travel — grace without
     advantage. */
  pause: {
    reacquireSeconds: 1.2,
    rewindSeconds: 0.25,
  },

  fx: {
    hitParticles: 14,
    hitParticles2: 8,
    passParticles: 6,
    nearMissParticles: 10,
    phaseParticles: 22,
    winParticles: 40,
    loseParticles: 26,
    hitShake: 9,
    vignetteSeconds: 0.6,
    bannerSeconds: 1.5,
    endBeatMs: 900,
    trailScale: 0.20,    // trail arc length (deg) per deg/s of omega
    trailMinDeg: 5,
    trailMaxDeg: 62,
  },
};

/** Score the Results ring treats as a full circle. A strong clean run posts
    ~4,300–4,700 (see gate.mjs bot mean), so 3,000 closes on a good human run
    without being a formality. */
export const RESULT_TARGET_SCORE = 3000;
