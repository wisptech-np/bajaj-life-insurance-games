// data.js — Risk Strike tunables.
//
// Every number a designer would want to retune lives here. RiskStrikeGame.jsx and
// physics.js read from this file and never hard-code gameplay values; the only
// constants in those files are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745.

   Identity: IMPACT. Risk Strike owns the ignition-orange accent (#FF6A1A) and
   the ring language that goes with it — timing rings, shockwaves, impact
   flashes. Nothing else in the catalog is built on a concentric-ring motif over
   near-black, which is what keeps this game from reading like its neighbours.

   Figure/ground is the other half of the identity. The arena and the lane are
   pushed down to near-black indigo so the only high-value things on screen are
   the three that matter: the green risk bottles, the blue shield ball, and the
   orange impact. The previous mid-blue lane (#2B5FA6) sat at almost the same
   value as the ball and flattened the read at 360x640.

   Colour grammar, consistent with the rest of the catalog: green is ALWAYS risk,
   blue is ALWAYS protection, gold is the reward, orange is the moment of impact. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#2E7BF0',
  brandBlueGlow: 'rgba(46,123,240,0.6)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  virus: '#3FD34A',
  virusDeep: '#0E6420',
  virusCore: '#06380F',
  virusRim: '#C6FFB4',
  danger: '#FF5A5A',
  bgDark: '#050912',

  /* -- the signature accent ------------------------------------------------ */
  impact: '#FF6A1A',
  impactHot: '#FFE0B8',
  shock: 'rgba(255,138,61,0.95)',
  shockCool: 'rgba(140,200,255,0.85)',

  // Arena behind the deck — deliberately quiet.
  hallTop: '#070C1A',
  hallMid: '#0A1428',
  hallLow: '#0D1E3A',

  // Lane surface, near edge to far edge.
  laneNear: '#1B2C4E',
  laneMid: '#12203C',
  laneFar: '#070D1B',
  laneEdge: 'rgba(150,196,255,0.5)',
  laneGloss: 'rgba(160,200,255,0.18)',
  gutterTop: '#080E1C',
  gutterLow: '#02050C',
  approach: '#090F1D',
  foulLine: 'rgba(255,106,26,0.9)',
  arrow: 'rgba(255,138,61,0.45)',

  ink: '#FFFFFF',
  // 0.72 on #050912 clears WCAG AA body contrast (4.5:1); 0.62 did not.
  inkDim: 'rgba(255,255,255,0.72)',
  glass: 'rgba(255,255,255,0.06)',
  glassLine: 'rgba(255,255,255,0.14)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Lane units are centimetres, so the deck geometry is the real one: a 105 cm
   lane, 30.5 cm pin spacing, 21.7 cm ball, 12 cm pins. Only the length is
   shortened (11.8 m against a regulation 18.3 m) — a real lane at a phone-sized
   scale spends two and a half seconds of a two-minute session watching a ball
   travel, which is the wrong trade for a mobile game.

   Balance corrections carried against the spec's literal reading are marked
   CORRECTION and are explained in README.md "Balance notes". Every number under
   `flick`, `pins.topple*` and `winPins` was set from the headless simulation in
   scripts/balance-sim.mjs, which drives the shipped physics.js. */
export const GAME_CONFIG = {
  sessionSeconds: 120,
  frames: 5,

  /** Win gate: total pins knocked across the session (CORRECTION — see README).
      Set from scripts/balance-sim.mjs over 1,200 sessions per player profile
      against the shipped physics. The casual profile (aims for the pocket,
      8 degrees of thumb error) knocks a median of 43 pins, so 44 puts its win
      rate at 42.2% — inside the 40-50% band the brief asks for — while a player
      who goes for the pocket properly wins 75% and a wild one 4.5%. */
  winPins: 44,

  /** Bowling total is multiplied by this for the headline score. */
  scoreMultiplier: 10,

  lane: {
    halfWidth: 52.5,
    // Foul line to head pin. Everything else scales off this.
    length: 1180,
    // Deck depth behind the head pin: three rack rows plus the pit lip.
    deckDepth: 130,
    gutterWidth: 24,
    // Where the arrows sit, as a fraction of the lane length.
    arrowFrac: 0.34,
    // How far short of the head pin a gutter still counts as a gutter ball.
    // A ball that drifts into the channel level with the deck has already done
    // its work; one that leaves the lane before this line has not. Consumed
    // through physics.js `isShameGutter()` by both the game and the balance sim,
    // so the shipped rule and the measured rule cannot drift apart.
    gutterShameMargin: 60,
  },

  ball: {
    radius: 10.85,
    mass: 6.8,
    startX: 0,
    startY: 0,
    // Exponential velocity damping per second. A 700 u/s ball reaches the deck
    // in ~1.75 s having lost ~16% of its speed, which is close to a real lane.
    friction: 0.1,
    // Below this the ball has died on the lane and the throw is over.
    stallSpeed: 60,
    trailPoints: 16,
  },

  pins: {
    radius: 6.0,
    mass: 1.55,
    spacing: 30.5,
    // Placement noise (CORRECTION). Without it an identical flick always leaves
    // an identical rack, so the game reads as a lookup table rather than a deck.
    rackJitter: 0.7,

    ballRestitution: 0.42,
    restitution: 0.55,
    tangential: 0.16,
    // Bounce off the kickback plates flanking the deck (CORRECTION). Without
    // walls the corner pins are unreachable and every good hit leaves a 7 or a
    // 10; with them a pocket hit can strike, which is what makes the pocket
    // worth aiming at.
    kickback: 0.6,

    // A pin topples when it is pushed faster than this or shoved further than
    // this off its spot. Both gates matter: the speed gate catches a clean hit,
    // the displacement gate catches a slow shove from a falling neighbour.
    toppleSpeed: 24,
    toppleShift: 6.5,

    // A brushed pin rocks and settles rather than snapping back.
    wobbleSpring: 90,
    wobbleDamp: 3.2,
    restSpeed: 6,

    // A toppled pin keeps sliding (and keeps hitting its neighbours) for this
    // long before it is off the deck. This window is the chain reaction.
    fallDamp: 2.6,
    fallSeconds: 0.62,

    // Impulse above which a pin-pin contact is worth a sound.
    pinHitAudioImpulse: 8,

    // Drawn size in lane units — a real pin is 38 cm tall and 12 cm at the
    // belly. Collision still uses `radius`; this is presentation only.
    drawHeight: 38,
    drawWidth: 14,

    labels: { 1: 'Illness', 2: 'Accident', 3: 'Debt', 5: 'Inflation' },
  },

  /* -- flick → shot ------------------------------------------------------
     The gesture mapping. `angleGain` is the important one: a lane is 105 cm
     wide and 11.8 m long, so the whole playable spread of directions is under
     3 degrees. Passing the raw swipe angle through would put the gutter at a
     4-degree thumb wobble; the gain divides the swipe angle down into that
     spread, and the dotted aim line (truncated at the arrows) is what makes
     the mapping legible. */
  flick: {
    // Below this the gesture is a tap, not a throw.
    minDistancePx: 22,
    // Pointer speed at release that maps to minimum / maximum power.
    minSpeedPx: 240,
    maxSpeedPx: 2000,
    minPower: 430,
    maxPower: 900,
    // Slightly sub-linear so the middle of the range is easier to hit.
    powerCurve: 0.85,

    angleGain: 0.115,
    maxAngle: 0.05,

    // Lateral acceleration at full curl, u/s^2. At ~1.7 s of travel a full
    // hook bends the ball about 55 u — half the lane — which is enough to
    // swing from the left gutter into the right pocket.
    curveGain: 78,
    // Share of the hook that is present at the foul line. The rest ramps in
    // with the square of the distance, so the ball skids then bites.
    curveSkid: 0.18,

    // Release noise (CORRECTION). Identical inputs must not produce identical
    // throws, or a player who finds the pocket once strikes ten times running.
    angleJitter: 0.0026,
    powerJitter: 0.022,

    // Velocity is averaged over this window of pointer samples at release, so
    // a flick is measured by how fast the thumb was moving when it left the
    // glass rather than by the whole gesture's average.
    sampleWindowMs: 110,
    sampleCount: 12,

    // Turn between the first and second half of the swipe, in radians, that
    // counts as a full hook. 0.5 rad (~29 degrees) is a deliberate arc — a
    // straight swipe with normal thumb wobble stays well under it.
    curlFullTurn: 0.5,
    // Both halves of the swipe must be at least this long before the angle
    // between them means anything.
    curlMinSegmentPx: 9,
  },

  aim: {
    // The dotted line stops here, at the arrows: you aim at the arrows, not at
    // the pins. Showing the full path would remove the read entirely.
    previewFrac: 0.46,
    // 26 dots at 1/30 s covers ~0.87 s of travel, which reaches the arrow cap
    // at any playable power — so the line's length also reads as its speed.
    previewStep: 1 / 30,
    previewDots: 26,
  },

  /* -- pacing ----------------------------------------------------------- */
  // Quiet time after the last thing stops moving before the throw is tallied.
  throwSettleSeconds: 0.28,
  // Hard cap on one throw, so nothing can wedge the session.
  maxThrowSeconds: 7.5,
  // Beat between the tally banner and the next ball being ready.
  tallySeconds: 1.05,
  // Rack drop animation when a new frame is set.
  rackDropSeconds: 0.45,

  scoring: {
    // Floating text above the deck is the raw pinfall; the HUD score is the
    // bowling total x scoreMultiplier.
    pinPoints: 10,
  },

  /* -- camera ------------------------------------------------------------
     The pseudo-3D view is one pinhole camera. These four fractions fix where
     the lane sits on screen; the component solves the camera distance from
     them, so the perspective can be retuned without touching any draw code. */
  view: {
    horizonFrac: 0.13,
    nearFrac: 0.92,
    nearHalfFrac: 0.43,
    farHalfFrac: 0.115,
    // Pins render ~12 px wide; rasterising the sprite larger and scaling down
    // keeps the spikes and the cover band from turning to mush.
    spriteOversample: 3,
  },

  fx: {
    strikeParticles: 34,
    spareParticles: 22,
    pinParticles: 12,
    ballHitParticles: 10,
    gutterParticles: 8,
    winParticles: 40,
    strikeShake: 8,
    hitShake: 4.5,
    hitStopSeconds: 0.07,
    bannerSeconds: 1.25,
    // Minimum gap between pin-clack ticks. A rack in full collapse produces
    // dozens of contacts a second and they would otherwise fuse into a buzz.
    clackGapSeconds: 0.055,

    /* -- impact signature -------------------------------------------------
       The ring language. A shockwave is an ellipse flattened onto the lane
       plane, so it reads as ground-level energy rather than a flat HUD circle.
       Cap is the pool size: rings past it recycle the oldest slot. */
    shockSeconds: 0.42,
    shockStrikeSeconds: 0.62,
    shockCap: 10,
    // Full-screen impact flash, in seconds and peak alpha.
    flashSeconds: 0.26,
    flashPeak: 0.5,
    strikeFlashPeak: 0.8,
  },

  hud: {
    endBeatMs: 650,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle.
    Simulated casual sessions score a median of 490 and the pocket-hunting
    profile 570; a game with three strikes in it lands near 900, which is what
    the ring is calibrated to. See README "Balance notes". */
export const RESULT_TARGET_SCORE = 900;

/** The four labelled front pins, in the order the Results screen lists them. */
export const RISK_LABELS = ['Illness', 'Accident', 'Debt', 'Inflation'];
