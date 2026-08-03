// data.js — Risk Radar tunables. EVERY gameplay number lives here.
//
// Financial hook: you can't see risks coming — your cover can. Send out the
// radar, read the danger, and walk the family home.
//
// The maze is hand-authored as an axis-aligned centreline polyline with a
// per-leg half-width; rules.js turns it into wall segments (offset + miter),
// applies the authored cuts (junction openings) and appends the authored
// extra walls (the false-floor decoy pocket). Coordinates are world px.

export const COLORS = {
  blue: '#003DA6',
  blueBright: '#1E6BE0',
  orange: '#F26522',
  orangeBright: '#FF8A3D',
  green: '#28A745',
  bgDark: '#0B1221',
  // gameplay palette (the reveal grammar)
  wall: '#E8F1FF',        // walls light white
  hazard: '#FF5A5A',      // hazards light red
  hazardDeep: '#8C1616',
  exitGold: '#FFC845',    // the shelter lights gold
  follower: '#8FC6FF',    // family lights soft blue
  playerCore: '#FFFFFF',
  lurker: '#FF4D4D',
  lurkerRing: 'rgba(170,178,196,0.55)', // the lurker's own gray ring
  pulseCyan: 'rgba(96,205,255,0.55)',
  pulseCore: 'rgba(255,255,255,0.85)',
  pulseFringe: 'rgba(255,150,80,0.4)',
  mote: 'rgba(180,215,255,0.8)',
};

export const GAME_CONFIG = {
  // ---- Session --------------------------------------------------------------
  sessionSeconds: 100,
  hearts: 3,
  sessionSeed: 20260729,        // lurker patrol phases; the gate's bot proves this seed

  // ---- Player / family ------------------------------------------------------
  player: {
    speed: 105,                 // px/s hold-to-walk
    radius: 10,                 // collision radius
    stopDistance: 6,            // arrive threshold at the finger point
    // No tap-vs-hold arming any more: touching the maze always walks, and the
    // radar has its own button. One gesture, one meaning.
    followerCount: 2,
    followerSpacing: 12,        // px between bodies on the breadcrumb trail
    followerRadius: 8,
    followerReturnSpeed: 130,   // caught follower walks the path back to you
    followerReattachArc: 26,
    invulnSeconds: 2.0,         // party-wide after any heart loss
    footstepEverySeconds: 0.32, // micro-ring cadence while walking
  },

  // ---- The pulse ------------------------------------------------------------
  pulse: {
    speed: 460,                 // px/s wavefront expansion
    maxRadius: 400,
    thickness: 18,              // a chunk lights when |dist - ringRadius| < thickness
    cooldownSeconds: 1.6,       // no stock — one thumb-ring recharge
    holdSeconds: 1.0,           // revealed geometry holds at alpha 1.0 ...
    fadeSeconds: 0.7,           // ... then fades over this
  },

  // ---- Noise economy --------------------------------------------------------
  noise: {
    hearRadius: 320,            // a lurker within this of a pulse hears it
    aggroSpeed: 95,             // moves toward the pulse ORIGIN (not you) ...
    aggroSeconds: 1.6,          // ... for this long, then sniffs the spot
    investigateSeconds: 3.0,    // distracted at the stale origin — the pass window
    distractedCatchDist: 14,    // head-down sniffing barely catches
  },

  // ---- Lurkers --------------------------------------------------------------
  lurker: {
    radius: 12,
    patrolSpeed: 55,
    returnSpeed: 70,            // walking back to its band (all speeds <= 0.9x player)
    catchDistPlayer: 22,        // lurker r + player r
    catchDistFollower: 20,
    sniffWallGap: 13,           // investigate offset = halfWidth - this (it noses the wall)
    selfRingEverySeconds: 3.2,  // every lurker telegraphs itself on this clock
    selfRingRadius: 200,
    selfRingSpeed: 320,
    forceRingWithin: 250,       // inside this of the player it MUST re-ring ...
    forceRingMinInterval: 2.4,  // ... at least this often
    telegraphMaxAge: 3.2,       // FAIRNESS: no catch unless telegraphed within this
    softCatchGraceSeconds: 0.7, // catch radius stays distracted-soft briefly after
                                // investigate/retreat end — no snap-catch mid-pass
    lunge: {
      triggerDist: 85,          // 2D trigger (a 72px lunge must be able to connect) ...
      triggerArcDist: 110,      // ... AND along-corridor, so it never shrieks through a wall
      shriekSeconds: 0.5,       // locked wind-up: shriek sound + screen-edge flash
      speed: 180,
      durationSeconds: 0.4,
      retreatSeconds: 1.2,      // spent afterwards — non-lethal while it dives PAST you,
      retreatDiveBehind: 120,   // ending up behind — the intended pass window
      retreatSpeed: 100,        // non-lethal, so the 0.9x cruise cap does not apply
      cooldownSeconds: 2.5,
    },
  },

  // ---- Static hazards / pickups --------------------------------------------
  hazards: {
    spikeRadius: 26,
    shimmerWithin: 110,         // ember shimmer telegraph range (never a wall reveal)
  },
  orbs: { radius: 9, pickupDist: 22 },
  exit: { radius: 24 },

  // ---- Scoring --------------------------------------------------------------
  scoring: {
    perHeart: 250,
    perSecondRemaining: 10,
    perOrb: 60,
    quietBonus: 300,
    quietMaxPulses: 18,
    resultRingTarget: 1500,     // results screen progress ring
  },

  // ---- Reveal rendering -----------------------------------------------------
  reveal: {
    chunkLen: 14,               // wall subdivision for wavefront lighting
    lurkerRingStrength: 0.30,   // gray rings paint walls faintly
    lurkerRingHold: 0.35,
    lurkerRingBand: 16,
    footstepStrength: 0.28,     // footsteps breathe the world within ...
    footstepRadius: 34,         // ... this of your feet
    footstepHold: 0.2,
    // MEMORY MAP: once a wavefront has swept a chunk it never returns to pure
    // black — it settles to strength * memoryFloor and stays. The darkness now
    // governs how far AHEAD you can plan, not whether you can see at all.
    // (Wiped on pause, exactly like every other reveal — see beginPause.)
    memoryFloor: 0.30,
    entityMemory: 0.36,         // same idea for static landmarks (pools, orbs,
                                // checkpoints, shelter). Living things get NO
                                // memory: a stale ghost of a lurker is a lie.
  },

  // ---- HUD / feel -----------------------------------------------------------
  hud: {
    lowTimeSeconds: 15,
    reacquireFreezeSeconds: 1.5, // resume 3-2-1 (>= 1.2s required), clock held
    reacquireLockSeconds: 0.25,  // live input lock right after the count
    bannerSeconds: 1.7,
    openingPingSeconds: 1.1,     // the game fires the first ping for you
    coachSeconds: 9,             // a coach step gives up and moves on after this
    labelSeconds: 3.2,           // first-encounter signal label dwell
    legendSeconds: 6,            // legend card auto-dismiss
    lureMarkSeconds: 3.4,        // "they are walking to here" marker at a heard ping
  },
  fx: {
    footstepRingPx: 28,
    footstepRingSeconds: 0.5,
    heartLossShake: 8,
    shriekFlashSeconds: 0.55,
    vignetteSeconds: 0.7,
    vignetteEdge: 0.58,         // was 0.82 — the memory map has to survive it
    goodFlashSeconds: 0.5,      // green edge wash on a correct decision
    hazThrobHz: 1.5,            // risk pools breathe: shape AND rhythm, not colour
    exitBeaconSeconds: 2.0,     // the shelter rings for you once you have found it
    dustMotes: 150,
    moteLitSeconds: 0.55,
    endBeatMs: 950,
    heartbeatBpmFar: 80,        // proximity heartbeat ...
    heartbeatBpmNear: 140,      // ... as the nearest threat closes from
    heartbeatRange: 200,        // this range to touching
    orbParticles: 14,
    gateParticles: 12,
    catchParticles: 18,
  },

  // ---- The maze (hand-authored, one continuous path, ~2,720px) --------------
  maze: {
    bounds: { minX: 40, minY: 610, maxX: 500, maxY: 1530 },
    path: {
      // 14 points, 13 strictly alternating H/V legs. Segment widths:
      // legs 0-3 corridor 72 (hw 36) | legs 4-7 corridor 56 (hw 28) | legs 8-12 corridor 48 (hw 24)
      pts: [
        [96, 1470], [448, 1470], [448, 1338], [128, 1338], [128, 1218],
        [436, 1218], [436, 1096], [124, 1096], [124, 980],
        [420, 980], [420, 864], [176, 864], [176, 754], [348, 754],
      ],
      halfWidths: [36, 36, 36, 36, 28, 28, 28, 28, 24, 24, 24, 24, 24],
    },
    // False-floor decoy: from the corner at (176,754) the corridor APPEARS to
    // continue straight up — a dead-end pocket holding orb 5 behind a spike
    // pool — while the real exit is the unassuming right turn.
    extraWalls: [
      [152, 634, 152, 730],
      [200, 634, 200, 730],
      [152, 634, 200, 634],
    ],
    cuts: [{ x1: 151, y1: 726, x2: 201, y2: 734 }], // opens the pocket mouth
    gates: [{ s: 924 }, { s: 1782 }, { s: 2438 }],  // checkpoints at the seam of each segment
    exitPos: [348, 754],
    // Spike pools tucked against walls — each leaves a dark side to squeeze past.
    hazards: [
      [250, 1506], // seg 1, bottom wall of the first run
      [300, 1302], // seg 1, top wall of the return run
      [164, 1288], // seg 1, east wall of the first climb
      [300, 1246], // seg 2, bottom wall — tight 10px window
      [240, 1068], // seg 2, top wall
      [176, 648],  // seg 3, sealed end of the decoy pocket
    ],
    orbs: [
      [448, 1404], [118, 1280], [436, 1160], [124, 1030],
      [176, 696],  // the decoy orb — guarded by the pocket pool
    ],
    // Lurkers move along the corridor arc. lo/hi = patrol band,
    // chaseLo/chaseHi = hard clamp when lured by pulses. `side` is the wall it
    // noses while investigating (chosen so the open side never crosses a pool).
    lurkers: [
      { kind: 'patroller', lo: 1250, hi: 1650, chaseLo: 1080, chaseHi: 1700, side: -1 },
      { kind: 'patroller', lo: 1860, hi: 2000, chaseLo: 1840, chaseHi: 2040, side: -1 },
      { kind: 'lunger', lo: 2300, hi: 2360, chaseLo: 2130, chaseHi: 2438, side: 1 },
    ],
  },
};
