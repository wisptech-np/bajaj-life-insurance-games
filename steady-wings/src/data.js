// data.js — Steady Wings tunables.
//
// Every number a designer would want to retune lives here. SteadyWingsGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glider proportions).
//
// The pure module src/flight.js takes this object as a parameter — it never
// imports it — so scripts/balance.mjs can run the SHIPPED level generator and
// the SHIPPED physics headless against the SHIPPED numbers.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand tokens from index.css: --ls-blue #005BAC, --ls-blue-dark #004080,
   --ls-blue-light #3B8DD4, --ls-orange #F26922, Poppins.

   Colour grammar: ORANGE is the glider — you, the cover in flight. BLUE is the
   sky you are keeping it in and the shield token that saves you once. GOLD is a
   premium kept on time (coins, the gate flash). RED/SLATE is an expense wall:
   the pillars are cool grey-blue masonry with a red-hot lip at the gap edge, so
   the thing that kills you reads as a bill, not as scenery. */
export const COLORS = {
  brandBlue: '#005BAC',
  brandBlueDark: '#004080',
  brandBlueLt: '#3B8DD4',
  brandBlueGlow: 'rgba(59,141,212,0.55)',

  orange: '#F26922',
  orangeLt: '#FF8533',
  orangeDeep: '#B33F10',

  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',

  green: '#22C55E',
  greenLt: '#6EE7A2',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#051A3A',
  skyTop: '#051A3A',
  skyMid: '#0E4F94',
  skyLow: '#2F7CBE',
  skyHaze: 'rgba(59,141,212,0.20)',

  cloudFar: 'rgba(255,255,255,0.10)',
  cloudNear: 'rgba(255,255,255,0.18)',
  ridge: 'rgba(4,20,46,0.85)',
  ridgeFar: 'rgba(8,38,78,0.6)',

  pillar: '#2C4364',
  pillarLt: '#4C6E9B',
  pillarDeep: '#16273F',
  pillarEdge: '#8FB4DF',
  pillarLip: '#F2694C',
  pillarLipLt: '#FFB199',

  glider: '#F26922',
  gliderLt: '#FF9A55',
  gliderDeep: '#8F3208',
  gliderGlass: 'rgba(214,238,255,0.92)',

  shield: '#3B8DD4',
  shieldLt: '#BFE0FF',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.06)',
  glassLine: 'rgba(255,255,255,0.14)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure module src/flight.js and therefore by
   scripts/balance.mjs. Every win-rate number quoted below was measured by that
   script against exactly these values.

   UNITS. The whole simulation is normalised: y runs 0 (ceiling) to 1 (floor)
   and every horizontal distance is expressed in playfield HEIGHTS. Velocities
   are heights/second, gravity heights/second². The renderer multiplies by the
   measured playfield height, so a 360x640 handset and a 430x900 one play the
   identical game rather than two games that happen to share a config — the
   wealth-drop lesson (its coin kept the same absolute sideways authority while
   the board shrank, and the win rate moved 20 points between two screen sizes).
   Nothing in flight.js knows what a pixel is. */
export const GAME_CONFIG = {
  /* Hard cap on the session. A full 24-gate run takes ~64 s (see the pacing
     block in scripts/balance.mjs, which adds it up from these numbers), so the
     clock is a 36 s backstop rather than the real lose path; the real lose path
     is a pillar, the floor or the ceiling. */
  sessionSeconds: 100,

  /** Win line. Reaching it ends the run immediately. */
  gatesToWin: 24,

  /* -- The world -----------------------------------------------------------
     `birdXFrac` is the only figure expressed against canvas WIDTH: it is where
     the glider sits on screen. Everything else is in playfield heights. */
  world: {
    /** Collision radius. The drawn glider's wings sweep back past it — the
        fuselage is what the circle covers — which is the usual arcade
        forgiveness and is why a wingtip may cross a pillar's lip on a near
        miss without ending the run. */
    gliderRadius: 0.032,
    birdXFrac: 0.30,
    /** Distance between consecutive gate leading edges. */
    gateSpacing: 0.79,
    /** Runway before gate 1 arrives — the beat that teaches the tap. */
    leadInDistance: 0.95,
    pillarWidth: 0.13,
    /** Minimum distance from ceiling/floor to the nearest gap edge. */
    edgeMargin: 0.055,
    /** Ceiling on |Δ centre| between consecutive gates. Not a difficulty knob —
        a fairness one: it is what makes the reachability proof in
        scripts/balance.mjs a property of the generator rather than a lucky
        draw. See `reachability` below for the envelope it has to fit inside. */
    maxCentreDelta: 0.26,
    /** Floor on |Δ centre| between consecutive gates. Without it a seed can
        serve six gates on one line and the run degenerates into holding a
        rhythm with nothing to read. Asserted non-degenerate in the gate. */
    minCentreDelta: 0.07,
  },

  /* -- Flight --------------------------------------------------------------
     One tap SETS vy to -flapVelocity (it does not add to it); gravity does the
     rest. Two derived numbers govern how the game feels and how hard it is:

       hop   = flapVelocity² / (2·gravity) = 0.0484 heights (~29 px at 600)
               how far the glider rises after a tap before it starts sinking.
       cycle = 2·flapVelocity / gravity    = 0.440 s
               tap-to-tap rhythm when holding a line — about 2.3 taps/second.

     Because the tap is a velocity SET, the glider can never sink past the line
     it was tapped at, so a pilot holding a line occupies a band exactly one hop
     tall. The gap it has to fit that band inside is `gapHeight - 2·gliderRadius`,
     so the margin actually being played with is

       m = (gapHeight - 2·gliderRadius) - hop

     which runs 0.228 at gate 1 down to 0.128 at gate 24. A tap mistimed by
     σ seconds displaces the glider by roughly σ·flapVelocity, so σ = 90 ms buys
     0.040 heights of error against a half-margin of 0.064 at the last gate.

     These four numbers were chosen by measurement, not by feel: a 45-cell sweep
     over (flapVelocity, cycle, pillarWidth, gap.end) is tabulated in
     okf-brain/steady-wings/log.md. flapVelocity is by far the sharpest lever —
     it raises the hop quadratically and the error only linearly, so at this
     cycle 0.44 -> 0.48 -> 0.52 walks the honest pilot 34.2% -> 22.5% -> 13.8%.

     The first build used 0.70/2.6/r0.035, a Flappy-Bird-sized hop of 0.0942
     against a usable gate-24 slot of 0.170: a half-margin of 0.0379 h against a
     90 ms positional error of 0.0630 h. Re-measured under the corrected control
     law, that configuration gives perfect 100.0% / sharp 99.8% / honest 0.7% —
     i.e. it was flyable and even masterable, but it put the honest pilot two
     orders of magnitude below the briefed 25-45% band. A 24-link survival chain
     needs ~95.5% per gate and cannot carry a hop that close to the clearance. */
  physics: {
    gravity: 2.00,
    flapVelocity: 0.44,
    /** Terminal velocity. Also the number the anti-tunnelling assertion is
        argued against: 1.24 heights/s x the kit's 1/120 s step = 0.0103, well
        inside the 0.176-height narrowest usable gap. */
    maxFall: 1.24,
    /** Clamp only — a tap sets vy to -0.44, so this is never the binding
        limit. It exists so a future upward force cannot break the step bound. */
    maxRise: 0.60,
    /** A finger cannot tap faster than this, so neither can a bot. Caps the
        sustained climb rate at flapVelocity - gravity·interval/2 = 0.35
        heights/s, which is the climb term in the reachability envelope, and
        stops the spam bot from riding the ceiling for free. */
    minFlapInterval: 0.09,
  },

  /* -- Scroll --------------------------------------------------------------
     Gates sit at fixed world positions, so a faster scroll shortens the
     interval between them rather than moving them: 2.90 s -> 2.59 s -> 2.32 s.
     `rampAfterGates` counts gates PASSED, so the step lands as gate 9 and
     gate 17 arrive, exactly as briefed. */
  scroll: {
    base: 0.272,
    rampAfterGates: [8, 16],
    rampFactor: 1.12,
  },

  /* -- The gaps ------------------------------------------------------------
     34% -> 24% of the playfield, exactly as briefed. Worth saying explicitly
     because the first build could not hold it: at the original 0.70/2.6 flight
     physics the honest pilot measured 0.0% here and the temptation was to widen
     the gaps. The sweep in okf-brain/steady-wings/log.md says that would have
     been the wrong knob — softening the hop instead keeps the briefed silhouette
     (a genuinely narrow slot at gate 24) AND lands the pilot at 34.2%. */
  gap: {
    start: 0.34,
    end: 0.24,
    /** From this gate on (1-based), gaps drift vertically. */
    driftFromGate: 12,
    driftAmplitude: 0.045,
    driftPeriodSeconds: 3.1,
  },

  /* -- Reachability --------------------------------------------------------
     Asserted by scripts/balance.mjs over every generated sequence, in two
     independent halves:

       TRAVEL        the glider must be able to climb or sink from any gap
                     centre to the next inside the time the scroll gives it,
                     with `slackHeights` left over for the hop itself;
       LINE-HOLDING  and then STAY in the slot while crossing it — every
                     drifting gate must leave room for the drift-inflated hold
                     band plus `2 · pilotJitterSeconds · flapVelocity` of tap
                     error. See `lineHoldBand` in flight.js.

     The travel half alone is necessary but NOT sufficient, and review proved it
     rather than argued it: with `gap.driftAmplitude` doubled, every leg still
     passed at 82.6% of budget while the honest pilot fell from 34.5% to 18.7%.
     A drifting slot slides at up to driftAmp·omega, so the band the pilot must
     fit inside it inflates from 0.0484 h to 0.0705 h — 46% larger, against a
     usable slot of 0.176 h. The line-holding half is what catches that, and it
     correctly fails the doubled-drift configuration. */
  reachability: {
    slackHeights: 0.12,
    /** The honest pilot's tap jitter, in seconds — the figure the balance band
        is specified against (spec §1: "gaussian timing error sigma = 90ms").
        Lives here rather than only in the sim so the line-holding assertion is
        argued against a shipped constant. */
    pilotJitterSeconds: 0.090,
  },

  /* -- Pickups -------------------------------------------------------------
     One coin dead-centre in every gap (the reward for the line you already
     want) plus a three-coin arc strung between gates along the path from one
     centre to the next (the reward for flying it smoothly). A shield token
     replaces the middle coin of the arc before gates 4, 12 and 20 — "every
     ~8 gates" as briefed. */
  pickups: {
    coinRadius: 0.026,
    arcCount: 3,
    arcSpanFrac: 0.30,
    tokenRadius: 0.034,
    tokenBeforeGates: [4, 12, 20],
  },

  /* -- Shield --------------------------------------------------------------
     Absorbs one collision. The invulnerability window is computed from the
     glider's remaining crossing time, not a flat constant: a flat window either
     expires inside the pillar (instant second death, which is not "absorbed")
     or runs long enough to walk through the next gate. */
  shield: {
    graceSeconds: 0.35,
    /** Upward bump on absorb, as a fraction of flapVelocity. Reads as the
        shield shoving you clear, and keeps a low absorb off the floor. */
    bumpFrac: 0.60,
  },

  /* -- Scoring -------------------------------------------------------------
     Gate 50, coin 25, near-miss +30, shield still intact at the win +150. */
  scoring: {
    gate: 50,
    coin: 25,
    nearMiss: 30,
    shieldIntactBonus: 150,
    /** A pass counts as a near miss when the closest approach to either pillar
        edge is inside this many heights.

        The brief says "within 12px", which is 0.02 heights on the 600-height
        reference playfield, and that is what shipped first — but it made the
        whole scoring lane vestigial. A pilot holding a line occupies a band
        one hop tall, so at gate 24 its closest approach to an edge is
        (0.176 − 0.0484)/2 = 0.064 h even when perfectly centred: more than
        three times the 0.02 band. Measured, the sharp bot scored 0.01 near
        misses per run and the honest pilot 2.79 across a winning 24-gate run,
        so the results tile read zero for every competent player and a briefed
        scoring lane was dead on arrival.

        Widened to 0.035 h. This is SCORING ONLY — survival is `clear >= 0` and
        is untouched, so it cannot move the balance band; the gate re-run
        confirms the win rates are unchanged and only the near-miss counts and
        the score ceiling move. */
    nearMissBand: 0.035,
  },

  /* -- Expense walls -------------------------------------------------------
     The label on each pillar pair, cycled from gate 1. Kept short: the label is
     drawn rotated inside a 0.13-height-wide pillar. */
  expenses: [
    'SCHOOL FEES',
    'MEDICAL BILL',
    'EMI HIKE',
    'GADGET SPLURGE',
    'RENT DUE',
    'CAR SERVICE',
    'FESTIVAL SPEND',
    'TUITION FEES',
  ],

  fx: {
    flapParticles: 8,
    coinParticles: 12,
    gateParticles: 14,
    nearMissParticles: 10,
    tokenParticles: 18,
    shieldShatterParticles: 22,
    crashParticles: 26,
    winParticles: 40,
    crashShake: 9,
    shieldShake: 5,
    hitStopSeconds: 0.07,
    squashSeconds: 0.22,
    gateFlashSeconds: 0.55,
    bannerSeconds: 1.3,
    /** Beat between the run ending on screen and the results screen. */
    endBeatMs: 900,
  },

  hud: {
    /** INERT at the shipped pacing. A full 24-gate run is 64.6 s against the
        briefed 100 s clock, so the countdown never reaches 15 s remaining and
        the low-time pulse never fires. Kept, with `onExpire` in the component,
        as the clock backstop: if a future scroll retune pushed a run past 100 s
        there would otherwise be no terminating condition. scripts/balance.mjs
        asserts the run still fits the clock, so this cannot go live silently. */
    lowTimeSeconds: 15,
  },
};

/**
 * Score the Results ring treats as a full circle.
 *
 * A presentation stretch line, not the win condition (that is `gatesToWin`). It
 * has to be REACHABLE, which constrains it: the run ends the moment gate 24 is
 * cleared, so no run can contain more than 24 gates, 24 in-gap coins, 21 x 3
 * arc coins (three of those slots are shield tokens), 24 near misses and one
 * intact shield. scripts/balance.mjs brute-forces that ceiling from the shipped
 * scoring table and asserts this value sits under it, so it cannot silently
 * become unreachable when the scoring is retuned (the goal-keeper lesson, where
 * a 1600 target sat above a 1475 ceiling and the ring could never close).
 *
 *   scoring-table upper bound                              4,395
 *   best score any `sharp` run actually posted             3,150
 *   `sharp` profile, mean of 1,600 runs                    2,748
 *   `spec` profile, mean of its 552 winning runs           2,722
 *
 * 2,600 fills for a clean 24-gate run that banks the pickups without hunting
 * near misses. The gate asserts this against BOTH the argued upper bound and
 * the best score the sharp profile demonstrably posted, so the ring cannot be
 * decorative even if the upper bound is loose.
 */
export const RESULT_TARGET_SCORE = 2600;
