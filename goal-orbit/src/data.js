// data.js — Goal Orbit tunables.
//
// Every number a designer would want to retune lives here. GoalOrbitGame.jsx and
// orbit.js read from this file and never hard-code gameplay values; the only
// constants in those files are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.
//
// Balance corrections carried against the brief's literal reading are marked
// CORRECTION and are explained in README.md "Balance notes". Every number in the
// `orbit`, `planets` and `asteroids` blocks was measured by tools/balance-sim.mjs,
// which imports THIS file and orbit.js — the numbers below are the ones the game
// actually runs.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar, kept consistent with the rest of the catalog: green is ALWAYS
   risk (the virus asteroids), blue is ALWAYS protection and progress (the comet,
   orbit rings, gravity wells), gold is wealth (coins) and marks the milestone
   planets. Deep space is the #0B1221 family so the game reads as one product
   with the shell around it. */
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
  virusRim: '#127A28',
  danger: '#EF4444',
  bgDark: '#0B1221',

  spaceTop: '#050C1E',
  spaceMid: '#08183A',
  spaceLow: '#0B2350',

  cometCore: '#FFFFFF',
  cometMid: '#9FCCFF',
  cometEdge: '#1E6BE0',
  trail: 'rgba(126,184,255,0.8)',

  ring: 'rgba(126,184,255,0.32)',
  ringLive: 'rgba(180,214,255,0.9)',
  ringGold: 'rgba(255,200,69,0.8)',
  well: 'rgba(30,107,224,0.34)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Planet vector art ───────────────────────────────────
   Five distinct planet builds, cycled down the chain so no two neighbours look
   alike. Every one is drawn programmatically (layered radial gradients, bands,
   craters, terminator shadow) — no emoji, no image files. `kind` selects the
   extra detail pass in GoalOrbitGame.jsx. */
export const PLANET_STYLES = [
  { kind: 'banded', hi: '#6FB4FF', mid: '#1E6BE0', low: '#04204F', detail: 'rgba(255,255,255,0.16)' },
  { kind: 'ringed', hi: '#FFD489', mid: '#E9962A', low: '#5E3006', detail: 'rgba(255,232,190,0.7)' },
  { kind: 'rocky', hi: '#B3C6E2', mid: '#5B7BA8', low: '#1A2A44', detail: 'rgba(10,20,38,0.4)' },
  { kind: 'city', hi: '#8CEBD4', mid: '#1E9781', low: '#04302A', detail: 'rgba(255,222,150,0.9)' },
  { kind: 'icy', hi: '#E6F1FF', mid: '#93BAEA', low: '#27406E', detail: 'rgba(255,255,255,0.85)' },
];

/** Goal names cycled down the chain. Planet 0 is Home — the goal you start on. */
export const GOAL_LABELS = [
  'Home', 'Education', 'Car', 'Marriage', 'Child',
  'Health', 'Savings', 'Business', 'Travel', 'Legacy',
];

/** Every 5th planet is a MILESTONE and takes one of these names instead. */
export const MILESTONE_LABELS = {
  5: 'First Job',
  10: 'Family',
  15: 'Wealth',
  20: 'Retirement',
};

/* ─── Gameplay configuration ──────────────────────────────
   `world`, `planets` and `orbit` are the balance sheet: they decide whether the
   run is winnable. `asteroids`, `coins`, `camera`, `fx` and `hud` are the
   presentation and generation tunables a designer would reach for next. */
export const GAME_CONFIG = {
  sessionSeconds: 120,
  lives: 3,

  /* -- world ------------------------------------------------------------- */
  // The chain is generated in fixed logical units and the whole scene is drawn
  // with one uniform scale = canvasWidth / world.width (CORRECTION). Generating
  // in screen pixels would make the game measurably easier on a wide phone —
  // and generation runs at mount, before the canvas has been measured, so there
  // is no screen width to reason about anyway. 410 is the playable width inside
  // the 430 px portrait shell.
  world: {
    width: 410,
    // Planet centres stay this far from the left/right edges so a full orbit
    // ring is always on screen.
    xMargin: 96,
    // Loss boundary in logical units beyond the visible frame.
    outMarginX: 54,
    outMarginY: 300,
  },

  /* -- chain ------------------------------------------------------------- */
  planets: {
    // Planets to REACH. The chain holds count + 1 nodes (Home is node 0 and is
    // not "reached"); capturing node `count` wins the run.
    count: 20,
    orbitRadius: [50, 64],
    // Planet body radius as a fraction of its orbit radius. Below ~0.5 so the
    // capture ring is always clear of the body: the comet is captured before it
    // can ever touch a planet, which is why there is no "crashed into a goal"
    // failure state.
    bodyFrac: 0.46,
    // Centre-to-centre spacing range for consecutive planets.
    gap: [186, 226],
    // Maximum sideways offset between neighbours. Larger values make the chain
    // zig-zag more; the vertical rise floor below keeps it climbing.
    maxDx: 118,
    minRise: 92,
    // Rings must not overlap: D >= Ra + Rb + this.
    minRingClearance: 30,
    milestoneEvery: 5,
    // Generation attempts per node before the spacing constraints are relaxed.
    maxAttempts: 60,
  },

  orbit: {
    // Angular speed ramp across the chain, radians/second. 1.35 rad/s is a
    // 4.7 s loop (readable, forgiving), 2.45 rad/s is a 2.6 s loop (tense but
    // fair — see `minWindowSeconds`, which is what actually bounds the ramp).
    // The ramp is also the session-length control: half a loop is the average
    // wait for the release window, so slowing the opening lengthens the run
    // without making any single transfer harder (CORRECTION — at the first-cut
    // 1.65/2.55 ramp a clean run measured 38 s, under the 60 s floor in
    // GAME_STANDARD §3).
    omegaStart: 1.35,
    omegaEnd: 2.45,

    // Release speed = omega * orbitRadius * launchBoost, clamped (CORRECTION).
    // A physically honest tangential release is omega*R ≈ 80 logical px/s at
    // the opening speed, which crosses a 200 px gap in 2.5 s — measured, that
    // reads as the comet being dragged rather than slung. The boost is the
    // slingshot the art already promises; the floor keeps the opening transfers
    // from crawling and the ceiling keeps the late ones readable.
    launchBoost: 1.6,
    launchSpeed: [150, 300],

    // CAPTURE ASSIST. Capture triggers when the comet comes within
    // targetOrbitRadius + captureBand of a planet centre, so a near-miss of the
    // ring snaps in instead of sailing past. 32 logical px is ~half an orbit
    // radius: measured over the generated chains it turns the release window
    // into 0.33-0.93 s of real time (see `minWindowSeconds`).
    captureBand: 32,
    // Radius is eased from the capture distance down to the ring over this long,
    // so capture reads as a gravity well pulling the comet in rather than a
    // teleport. The comet is already locked to the orbit during the ease.
    captureEaseSeconds: 0.26,
    captureEaseLambda: 14,

    // A release that has not been captured by now has left the chain. The
    // off-screen test almost always fires first; this is the backstop.
    maxFlightSeconds: 4.0,

    // GENERATOR GATE. A gap is rejected unless its release window is at least
    // this many seconds wide at the source planet's angular speed. This is the
    // "released tangent from any orbit point must be able to reach the next
    // capture ring" guarantee, enforced at generation and re-measured by
    // tools/balance-sim.mjs. 0.26 s is ~2 x the median human tap latency spread.
    minWindowSeconds: 0.26,
    // Also enforced in radians so a slow early planet cannot buy a knife-edge
    // window just by being slow.
    minWindowRadians: 0.5,

    // Comet collision radius, logical px. Deliberately smaller than the drawn
    // head + glow: a hazard that looks like it grazed you should not kill you.
    cometRadius: 8,
  },

  /* -- hazards ----------------------------------------------------------- */
  asteroids: {
    // Gaps 0 and 1 are clean: the first two transfers teach the release timing
    // without a hazard on the path.
    firstGap: 2,
    // Asteroid count per gap ramps from 1 to 2 across gaps firstGap..rampEndGap.
    perGap: [1, 2],
    rampEndGap: 18,
    radius: [9, 13],
    // Each asteroid oscillates along a straight axis broadly perpendicular to
    // the IDEAL TRANSFER LINE, so it sweeps ACROSS the flight path — a hazard
    // you beat by releasing a beat earlier or later, not by luck.
    //
    // The share of a cycle a rock spends blocking the line works out to
    //   4 * (rockRadius + cometRadius) / (2*pi * halfSpan * cos(crossing))
    // — note it is INDEPENDENT of the rock's speed, which cancels. So the fair-
    // ness knob is the radius-to-span ratio, not the pace (CORRECTION: the
    // first cut used radius [11,15] with halfSpan [34,66], which blocked ~32%
    // of the window per rock and killed a rock-dodging agent 2.9 times a run).
    // These values block ~17% per rock, and the generator gate below keeps the
    // combined figure honest.
    halfSpan: [55, 92],
    speed: [30, 58],
    // Position of the sweep centre along the transfer line, as a fraction of
    // its length. Anchoring to the transfer line rather than the planet-to-
    // planet axis is what makes rocks fit at all (CORRECTION): the transfer
    // line leaves the source ring tangentially, so it escapes the source's
    // keep-out disk far sooner than the axis, whose two keep-out disks overlap
    // at every authored spacing — laid out on the axis, 95% of rolled rocks
    // were rejected and a chain averaged one rock in total.
    along: [0.28, 0.72],
    // Sweep centre offset from the line, as a fraction of the half-span, on the
    // side AWAY from the source planet. Positive on both ends so the rock still
    // crosses the line twice per cycle; the near side runs straight back into
    // the ring the comet just left.
    offsetFrac: [0.3, 0.75],
    // Extra margin on the keep-out bound orbitRadius + rockRadius + cometRadius.
    ringMargin: 6,

    // -- solvability verification (CORRECTION) ---------------------------
    // Placement alone does not prove a gap is passable: an asteroid can sweep
    // the whole release window. The generator therefore SIMULATES the gap —
    // `verifyLoops` orbit loops x `verifySamples` release angles across the
    // window, flying each release against the moving asteroids — and re-rolls
    // the gap's asteroids (then drops one, then another) until a clear release
    // exists. `minClearFraction` stops a gap passing on a single needle.
    verifyLoops: 6,
    verifySamples: 6,
    minClearFraction: 0.45,
    // At least one clear release must exist within this many loops of arriving,
    // so a hazard costs a beat, never the session clock.
    maxWaitLoops: 3,
    rerollTries: 10,
  },

  /* -- pickups ----------------------------------------------------------- */
  coins: {
    // Coins sit ON the ideal transfer line for the gap — the line through the
    // target's centre — at these fractions of the flight. Flying the clean arc
    // is what collects them, so the reward and the skill are the same act.
    perGap: 3,
    at: [0.34, 0.55, 0.76],
    radius: 8,
    // Collect radius = coin radius + comet radius + this.
    pickupPad: 6,
  },

  /* -- scoring ----------------------------------------------------------- */
  scoring: {
    planet: 100,
    coin: 20,
    // Awarded when a transfer completes without the comet finishing more than
    // one full loop on the source planet.
    perfect: 50,
    milestone: 250,
    timeBonusPerSecond: 4,
  },

  /* -- respawn ----------------------------------------------------------- */
  respawn: {
    // Beat between the death burst and the comet reappearing on its last planet.
    delaySeconds: 0.55,
    invulnSeconds: 1.6,
  },

  /* -- camera ------------------------------------------------------------ */
  camera: {
    // The camera tracks the planet being orbited, and eases toward the target
    // planet during a transfer. It never tracks the comet directly: a camera
    // that circles with the orbit is nauseating on a phone.
    anchorFrac: 0.62,
    lambda: 4.2,
    // How far the camera leads toward the target planet mid-flight, 0..1.
    flightLead: 0.62,
  },

  /* -- presentation ------------------------------------------------------ */
  view: {
    starLayers: [
      { count: 46, size: [0.7, 1.5], parallax: 0.22, alpha: 0.5 },
      { count: 34, size: [1.0, 1.9], parallax: 0.45, alpha: 0.72 },
      { count: 20, size: [1.4, 2.6], parallax: 0.75, alpha: 0.95 },
    ],
    starTileHeight: 520,
    // Gravity-well glow radius as a multiple of the orbit radius.
    wellFrac: 1.55,
    trailSeconds: 0.55,
    // The release window is drawn on the ring for the first N planets only —
    // a teaching aid, not a permanent aim assist.
    windowHintPlanets: 2,
  },

  fx: {
    damageShake: 7,
    hitStopSeconds: 0.08,
    releaseParticles: 10,
    captureParticles: 16,
    coinParticles: 10,
    perfectParticles: 14,
    hitParticles: 20,
    milestoneParticles: 24,
    winParticles: 40,
    bannerSeconds: 1.8,
  },

  hud: {
    // Beat between the run ending on screen and the results screen appearing.
    endBeatMs: 600,
    lowTimeSeconds: 15,
  },
};

/** Milestones as an ordered list — the shape the Results screen wants. */
export const MILESTONE_LIST = Object.keys(MILESTONE_LABELS)
  .map((n) => ({ planet: Number(n), label: MILESTONE_LABELS[n] }))
  .sort((a, b) => a.planet - b.planet);

/** Label for planet index `i` on the chain. */
export function planetLabel(i) {
  return MILESTONE_LABELS[i] || GOAL_LABELS[i % GOAL_LABELS.length];
}

/** Score the Results ring treats as a full circle.
    A clean 20-planet run measures ~4,730: 2,000 (planets) + ~730 (36 of 60
    coins) + ~780 (15.6 perfects) + 1,000 (4 milestones) + ~220 (time bonus at
    ~64 s of the 120 s used). Measured by `node tools/balance-sim.mjs 250`:
    the well-timed agent means 4,731 and maxes 4,980 — see README
    "Balance notes" for the full tables. */
export const RESULT_TARGET_SCORE = 4800;
