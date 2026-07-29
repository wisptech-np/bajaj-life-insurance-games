// data.js — Time Shield tunables.
//
// Every number a designer would want to retune lives here. TimeShieldGame.jsx
// reads this file and never hard-codes gameplay values; the only constants in
// the component are drawing details (stroke widths, glyph proportions).
//
// The pure module src/rules.js takes this object as a PARAMETER — it never
// imports it — so gate.mjs runs the SHIPPED simulation headless against the
// SHIPPED numbers.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, bg #0B1221.

   Colour grammar. BLUE is the guardian and everything that protects — the
   shield ring, the zone gates, the win state. ORANGE is kinetic threat: every
   bullet, tracer and emitter is orange, so anything orange on screen can hurt.
   RED is only damage already taken (hit vignette, broken shield). GREEN is
   banked progress (cleared gates, score pops). STEEL is stopped time — the
   whole palette washes toward it when the world freezes, so the mechanic is
   readable in the colour before you notice a number. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  orangeDeep: '#B33F10',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  skyTop: '#07122B',
  skyMid: '#0C2350',
  skyLow: '#050D1E',

  steel: '#7C94AE',
  steelWash: 'rgba(116,140,168,0.30)',

  fog: 'rgba(148,170,196,0.85)',
  fogDeep: 'rgba(84,102,128,0.95)',

  wall: 'rgba(150,190,240,0.35)',
  gate: '#57E0A0',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Zone identities ─────────────────────────────────────
   Five life stages, bottom to top. The climb is a life: each gate crossed is a
   milestone protected. Names surface in the zone-clear banners and the HUD. */
export const ZONE_NAMES = ['First Job', 'New Home', 'Family', 'Health Scare', 'Retirement'];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/rules.js and therefore by gate.mjs. */
export const GAME_CONFIG = {
  /** Real-time session cap. The wall clock ALWAYS ticks — studying the field
      is spending the run. Expiry is a loss. */
  sessionSeconds: 105,

  /* -- Playfield -----------------------------------------------------------
     Fixed logical portrait field; the canvas letterboxes it into whatever
     stage it gets, so the sim is identical on every device (and in node). */
  field: {
    width: 390,
    height: 780,
    playerRadius: 14,
    startX: 195,
    startY: 720,
    /** Speed ceiling on the guardian, px/s — also caps per-step travel so the
        spring can never tunnel through a zone wall at 1/120. */
    maxSpeed: 1500,
  },

  /* -- The SUPERHOT rule ---------------------------------------------------
     timeScale = clamp(base + span * (effSpeed / vRef)^exponent, base, 1).
     effSpeed is the CHARACTER's speed (not the pointer's), smoothed with an
     EMA of time constant emaTauSeconds. Never binary: the 0.06 floor keeps
     the world creeping, which kills infinite freeze-analysis and keeps the
     scene feeling alive while you think. */
  timeMap: {
    base: 0.06,
    span: 0.94,
    vRef: 860,
    exponent: 0.85,
    emaTauSeconds: 0.10,
  },

  /** Critically damped spring dragging the guardian toward the finger.
      omega in 1/s; accel = omega^2 * (target - pos) - 2 * omega * vel. */
  spring: { omega: 18 },

  /* -- Anti-exploit: jitter farming ---------------------------------------
     Over a rolling window compute net displacement / path length. Wiggling in
     place has a huge path but no displacement; below the threshold the ratio
     multiplies the speed fed into the time mapping, so a wiggle advances the
     world no faster than standing still. */
  jitter: {
    windowSeconds: 0.30,
    ratioThreshold: 0.25,
  },

  /* -- Fog wall ------------------------------------------------------------
     Rises from below the field in REAL time. Touching it ends the run: the
     mechanical answer to a player who tries to freeze forever. */
  fog: {
    speedPxPerSec: 6,
    startY: 792,
  },

  /* -- Zone walls ----------------------------------------------------------
     Five walls stacked bottom -> top; each has one seeded gate gap. Crossing a
     gate clears the zone. Gate x is seeded per run within [gateMinX, gateMaxX]
     and successive gates are pushed at least gateMinSpread apart so the climb
     zig-zags. */
  walls: {
    ys: [630, 500, 370, 240, 110],
    thickness: 10,
    gateHalfWidth: 40,
    gateMinX: 78,
    gateMaxX: 312,
    gateMinSpread: 96,
    /** Anti-sprint: a zone's gate stays sealed until that zone's volley fire
        has travelled this many px of SCALED world distance. You cannot climb
        past a test you froze; letting world-time flow with live bullets in
        the air IS the toll — which is the whole SUPERHOT bargain. */
    unlockTravelPx: 210,
  },

  /* -- Hazards per zone (index 0 = zone 1, bottom) --------------------------
     Speeds are at timeScale 1. volleyCadence is in SCALED seconds; bullets is
     the lattice row size; gapMult is the lateral bullet spacing in player
     diameters (3.0 roomy -> 2.2 threading a needle). */
  zones: [
    { emitters: 1, volleyCadence: 2.2,   bullets: 5, gapMult: 3.0, laser: false, sweep: false },
    { emitters: 2, volleyCadence: 1.975, bullets: 6, gapMult: 2.8, laser: false, sweep: false },
    { emitters: 2, volleyCadence: 1.75,  bullets: 7, gapMult: 2.6, laser: true,  sweep: false },
    { emitters: 3, volleyCadence: 1.525, bullets: 8, gapMult: 2.4, laser: true,  sweep: true  },
    { emitters: 4, volleyCadence: 1.3,   bullets: 9, gapMult: 2.2, laser: true,  sweep: true  },
  ],

  bullets: {
    speed: 620,
    radius: 5,
    /** REAL-TIME telegraph before a volley goes live (emitter flash + tracer
        outline), so warnings are readable even while nearly frozen. */
    telegraphSeconds: 0.5,
    /** Lattice centre is the player's y at telegraph time, plus a seeded
        offset of up to this fraction of one gap either way. */
    aimJitterFrac: 0.35,
    /** First volley of a freshly entered zone arms after this fraction of the
        zone's cadence — a beat to read the room. */
    firstVolleyFrac: 0.6,
    poolSize: 96,
  },

  laser: {
    /** Rotation speed, degrees per SCALED second. */
    degPerSec: 40,
    /** Ray length from the pivot, px. Deliberately shorter than the
        half-field so the band edges stay laser-free corridors — the fan is
        mid-field pressure, not a scythe that reaps the whole zone. */
    length: 120,
    halfWidth: 4,
    /** The fan: two rays from the pivot, this many degrees apart, rotating
        together. A full line (spread 180) was measurably unplayable — it
        sweeps every lane twice per half-turn and closes every crossing
        window half the time. */
    spreadDeg: 90,
  },

  sweep: {
    /** Horizontal ping-pong speed, px per SCALED second. */
    speed: 140,
    width: 12,
    height: 64,
    marginX: 28,
  },

  /* -- Damage --------------------------------------------------------------
     First hit breaks the shield (i-frames + red vignette); the second reaches
     the core and ends the run. i-frames run on REAL time so slow-motion never
     shortens them. */
  hits: {
    maxHits: 2,
    iFrameSeconds: 1.2,
    /** A breaking shield throws the guardian clear of whatever broke it, so
        i-frame expiry can never re-hit in place. px/s. */
    knockbackSpeed: 520,
  },

  /* -- Scoring -------------------------------------------------------------
     zoneClear per gate crossed; nearMiss per bullet passing within
     nearMissDistance px of the guardian's rim, counted ONLY while
     timeScale > nearMissMinTs (no graze-farming while frozen); a style bonus
     up to styleMax for a session-average timeScale >= styleFrom (full at
     styleFull); + timeBonusPerSecond x seconds remaining on a win. */
  scoring: {
    zoneClear: 300,
    nearMiss: 25,
    nearMissDistance: 12,
    nearMissMinTs: 0.3,
    styleMax: 400,
    styleFrom: 0.45,
    styleFull: 0.80,
    timeBonusPerSecond: 8,
  },

  /* -- Pause / re-acquire --------------------------------------------------
     The kit auto-pauses on visibilitychange. Resume runs a visible 3-2-1
     count over freezeSeconds with the world AND the real-time clock held and
     input dead; on resume the EMA is zeroed so timeScale re-enters at the
     0.06 floor regardless of finger state. Pausing buys reading time only at
     the price the mechanic already charges for stillness. */
  pause: {
    freezeSeconds: 1.2,
  },

  /* -- Presentation --------------------------------------------------------
     Effect intensities; consumed by the component only. */
  fx: {
    hitParticles: 18,
    zoneParticles: 16,
    nearMissParticles: 5,
    winParticles: 40,
    loseParticles: 26,
    hitShake: 9,
    hitStopSeconds: 0.06,
    /** Bullet trail length in seconds-of-motion; drawn length scales with
        timeScale so frozen bullets hover with stub trails and fast ones
        streak. */
    trailSeconds: 0.05,
    /** Steel desaturation wash reaches full strength at the timeScale floor
        and fades out by desatUntilTs. */
    desatUntilTs: 0.3,
    desatMaxAlpha: 0.30,
    /** Whoosh sweep when timeScale re-crosses desatUntilTs upward. */
    whooshCooldownSeconds: 0.8,
    bannerSeconds: 1.5,
    endBeatMs: 900,
  },

  hud: {
    lowTimeSeconds: 20,
  },

  /* -- Audio pad -----------------------------------------------------------
     A continuous synth pad whose low-pass cutoff and pitch map directly to
     timeScale, so the mechanic is audible: frozen = dark and half-speed,
     moving = bright and full-speed. */
  pad: {
    cutoffMinHz: 200,
    cutoffMaxHz: 8000,
    rateMin: 0.5,
    rateMax: 1.0,
    baseFreqHz: 110,
    gain: 0.05,
  },
};

/** Score the Results ring treats as a full circle. A strong clear posts
    5x300 + ~12 near-misses + style + time bonus ~= 2,600-3,100. */
export const RESULT_TARGET_SCORE = 2800;
