// data.js — Legacy Echo tunables.
//
// Every number a designer would want to retune lives here. LegacyEchoGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph proportions).
//
// The pure module src/rules.js takes this object as a PARAMETER — it never
// imports it — so legacy-echo/gate.mjs runs the SHIPPED simulation headless
// against the SHIPPED numbers.
//
// Feel constants shared with every other game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, bg #0B1221.

   Colour grammar (three colours, three meanings — nothing else):
     ORANGE / gold = you, right now, and the chest you are moving.
     COOL TINT     = an echo, a run you already finished.
     GREEN         = held / open / safe. A pad turns green when a body is on
                     it and its gate turns green at the same moment.
   RED appears only when something is wrong: a shut gate you pushed into, or
   a loop you wasted. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
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
  floorSpine: '#101D3C',
  floorWing: '#0B1530',
  wall: '#233B6E',
  wallLit: '#3D5EA8',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* One hue per echo loop. Ghost 1 = your loop-1 self, and so on. */
export const GHOST_TINTS = [
  { key: 'cyan', body: '#4FC3F7', lt: '#B3E5FC', glow: 'rgba(79,195,247,0.5)' },
  { key: 'violet', body: '#B39DDB', lt: '#E1D6FF', glow: 'rgba(179,157,219,0.5)' },
  { key: 'amber', body: '#FFD54F', lt: '#FFECB3', glow: 'rgba(255,213,79,0.5)' },
  { key: 'rose', body: '#F48FB1', lt: '#FFD3E2', glow: 'rgba(244,143,177,0.5)' },
];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/rules.js and therefore by gate.mjs.

   ONE RULE, ONE VERB. Carry the gold chest from the bottom to the vault at
   the top. Two gates block the way; a gate is open only while every one of
   its green pads has a body standing on it. You control one body, so the
   only way to hold a pad AND walk through the gate it opens is to be two
   people — which is what the loop gives you: every finished loop replays as
   an echo that stands where you stood.

     3 pads total  ->  pad 1 opens gate 1, pads 2+3 open gate 2
     loop 1 hold pad 1, loop 2 hold pad 2, loop 3 hold pad 3, loop 4 carry
     (a player who repositions inside a loop wins in 3)

   Geometry, a hand-authored 390x780 portrait map:

     x 0..116   left wing  (bodies only — always open, holds pads)
     x 124..266 the spine  (the chest route, crossed by the 2 gates)
     x 274..390 right wing (bodies only)
     y 620..780 open muster zone (spawn + chest, full width)
     y 0..80    the family vault (chest across y=80 wins)

   The vertical spine walls run y 0..620; the chest only fits through the
   gates, while any body slips up the wings for free. */
export const GAME_CONFIG = {
  /* Session structure: 5 loops x 12 s + 1.5 s rewind between = ~67 s. */
  loops: {
    count: 5,
    seconds: 12,
    rewindSeconds: 1.5,   // full inter-loop transition
    scrubSeconds: 0.8,    // reverse-playback scrub inside the transition
    introSeconds: 0.9,    // frozen "LOOP 1" beat before the first loop only
    burnCheckSeconds: 3,  // anti-AFK: idle loops end early here
    burnPathPx: 64,       // < this much total path by the check = burned
  },

  field: {
    W: 390,
    H: 780,
    spineL: 124,          // spine interior left edge
    spineR: 266,          // spine interior right edge
    wallT: 8,             // spine wall thickness (walls at 116..124, 266..274)
    wallBottomY: 620,     // walls (and wings) end here; below is open muster
    vaultY: 80,           // chest centre at or above this y = delivered
  },

  body: {
    r: 13,
    maxSpeed: 260,        // px/s free
    carrySpeed: 190,      // px/s while carrying the chest
    followOmega: 14,      // critically damped drag-follow stiffness
    spawnX: 195,
    spawnY: 700,
  },

  /* Ghost state-track recording: fixed 120 Hz sim decimated to 60 Hz.
     12 s x 60 = 720 samples x 3 floats (x, y, actionBits) ~ 8.6 KB/loop. */
  record: {
    decimate: 2,          // write every 2nd fixed tick
    samplesPerLoop: 720,
  },

  ghosts: {
    max: 4,
    alpha: 0.5,
    cullPathPx: 64,       // ghosts that barely moved are not added/rendered
    // Fraction of a loop an echo must sit on a pad before the objective
    // treats that pad as "covered, move on to the next job".
    coverFraction: 0.3,
  },

  /* Gates cross the spine. A gate is open only while ALL its pads are held;
     k pads need k DISTINCT bodies (two on one pad still count as one). */
  doorT: 12,              // gate band thickness
  doors: [
    { y: 500, plates: [{ x: 58, y: 560 }] },
    { y: 250, plates: [{ x: 58, y: 330 }, { x: 332, y: 330 }] },
  ],
  plateR: 40,             // hold radius (visual socket is drawn smaller)

  chest: {
    x: 195,
    y: 660,
    pickupR: 30,
  },

  scoring: {
    deliver: 1000,
    unusedLoop: 400,      // x full loops left over after delivery
  },

  /* Anti-pause-scum re-acquire beat (kit auto-pauses on visibilitychange).
     Resume freezes the world + master loop clock behind a 3-2-1 count
     (>= 1.2 s required; 1.5 s shipped), then a short live input lock. */
  pause: {
    freezeSeconds: 1.5,
    lockSeconds: 0.35,
  },

  hud: {
    lowTimeSeconds: 4,
    bannerSeconds: 2.0,
  },

  fx: {
    doorParticles: 14,
    deliverParticles: 26,
    plateParticles: 8,
    blockShake: 5,
    blockCooldownSeconds: 1.1, // throttle the "gate is shut" nudge
    echoFlashSeconds: 1.2,
    endBeatMs: 1400,
    trailSampleEvery: 4,  // ghost trail: every 4th track sample
    trailLen: 7,
  },
};
