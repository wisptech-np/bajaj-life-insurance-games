// data.js — Goal Keeper tunables.
//
// Every number a designer would want to retune lives here. GoalKeeperGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, rig proportions).
//
// The pure modules src/shots.js and src/rules.js take this object as a
// parameter — they never import it — so scripts/balance.mjs can run the SHIPPED
// rules headless against the SHIPPED numbers.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar: ORANGE is you — the keeper's kit and gloves, the thing that
   stands between the ball and the net. BLUE is the striker and, behind him, the
   risk he represents. GREEN is a goal kept safe (saves, the win bar). RED is a
   goal conceded. GOLD is the family milestone banners hanging behind the net —
   the things you are actually defending. */
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
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  skyTop: '#08152F',
  skyMid: '#0A2450',
  skyLow: '#0C2E5E',

  standDark: '#071228',
  standLight: 'rgba(120,170,240,0.16)',

  turfTop: '#12613A',
  turfMid: '#0E4A2C',
  turfLow: '#092E1C',
  turfStripe: 'rgba(255,255,255,0.035)',
  turfLine: 'rgba(232,246,255,0.5)',

  net: 'rgba(206,228,255,0.30)',
  netLit: 'rgba(206,228,255,0.62)',
  post: '#F4F8FF',
  postShade: '#9FB4D8',

  ball: '#FFFFFF',
  ballShade: '#C9D6EA',
  ballPanel: '#0B1221',

  keeperKit: '#F26522',
  keeperKitDeep: '#A93A0D',
  glove: '#FFC845',
  gloveLt: '#FFE38A',

  strikerKit: '#1E6BE0',
  strikerKitDeep: '#00287A',
  skin: '#E8B98C',
  skinShade: '#B87F4E',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure modules (src/shots.js, src/rules.js) and therefore by
   scripts/balance.mjs. Every win-rate number quoted below was measured by that
   script against exactly these values. */
export const GAME_CONFIG = {
  /* Hard cap on the session. A typical run takes ~55 s (see `pacing`), so the
     clock is a backstop for a backgrounded phone rather than a real lose path;
     the real lose path is conceding five. */
  sessionSeconds: 100,

  shotsPerSession: 10,
  /** Win line. Reaching it ends the run early — a sixth save is match point. */
  savesToWin: 6,
  /** Lose line. Note 10 - 5 = 5 < 6, so this is exactly "the win is now out of
      reach"; the two conditions can never contradict each other. */
  concededToLose: 5,

  /* -- The shot ------------------------------------------------------------
     Timeline of one penalty, in ms from the moment the run-up starts:

        0 ............ cueMs ............ cueMs + flightMs
        |--- telegraph ---|------- ball in flight -------|
        run-up, body lean,        ball leaves the boot,
        plant foot points          zone becomes readable
        at `cueZone`               at revealFrac of flight

     The cue is truthful on 80% of shots. On the other 20% the striker plants
     toward one zone and finishes into a different one — the feint. Committing
     early to the cue is the fast way to save and the only way to reach a corner
     on a late shot; it is also the only way to be beaten by a feint. That trade
     is the game. */
  shot: {
    cueMs: 400,
    /** Flight time on shot 1, linearly ramped to `flightEndMs` by shot 10. */
    flightStartMs: 550,
    flightEndMs: 380,
    /** Every Nth shot is a Risk shot: faster and worth double. */
    riskEvery: 4,
    riskFlightScale: 0.82,
    /** Chance the telegraph lies. */
    feintChance: 0.20,
    /** Fraction of the flight after which the true zone is unambiguous. Used by
        the renderer (when the ball's trail turns solid) and by the sim's
        late-reader bot profile. */
    revealFrac: 0.34,
    /* How the telegraph becomes legible, as fractions of `cueMs`. The lean
       starts developing at `cueRampStartFrac` and is fully readable
       `cueRampSpanFrac` later — i.e. at 0.62 x 400 = 248 ms, well before the
       boot meets the ball.

       That headroom is deliberate and it is the cheapest lever the game has. A
       top corner costs 340 ms of dive and the last shots are only 380 ms in the
       air, so the arrival deadline on a shot-10 corner is ~465 ms; every
       millisecond the tell arrives earlier is a millisecond of the player's
       see-decide-move budget. `scripts/balance.mjs` prints a latency sweep
       showing win rate falling roughly 0.3 points per extra millisecond of
       commit latency around the operating point, so 60 ms is worth ~18 points to
       a slower player. Moved 0.22/0.55 -> 0.14/0.48 (308 ms -> 248 ms) for
       exactly that reason.

       Presentation only: the sim's bots commit on a fixed clock and never read
       the render path, so these two numbers cannot move the balance gate. */
    cueRampStartFrac: 0.14,
    cueRampSpanFrac: 0.48,
  },

  /* -- The dive ------------------------------------------------------------
     A dive is not instant. It takes `baseMs` to leave the ground plus
     `spanMs x reach` to cover the ground to the zone: 340 ms to a top corner,
     296 ms to a low corner, 237 ms to the top of the middle and 164 ms to the
     ball at your feet. A save needs the right zone AND a dive that arrives no
     later than the ball:

        commitMs + travel(zone) <= cueMs + flightMs + graceMs

     This is what turns the shrinking flight time into a real difficulty ramp
     rather than a cosmetic one: by shot 10 a keeper who waits for the ball can
     still reach the middle but can no longer reach a corner, so late shots have
     to be read off the telegraph. It is also what gives the sim's 150 ms
     dive-commitment latency something to bite on.

     `reach` is indexed by zone id (col + row * 3): low L/C/R then high L/C/R. */
  dive: {
    baseMs: 120,
    spanMs: 220,
    reach: [0.80, 0.20, 0.80, 1.00, 0.53, 1.00],
    /* Forgiveness on the arrival deadline. Kept modest deliberately: a large
       buffer here erases the timing ramp above.

       Raised 25 -> 50 -> 90 to pay for the two costs a real finger carries that
       a bot in the sim does not:

         - the touch pipeline (`deviceLatencyMs`, 25 ms): a handset delivers a
           pointerup 20-60 ms after the finger actually moved, and `s.shotMs` is
           itself up to one 120 Hz step (8.3 ms) stale;
         - the swipe itself (`swipeAllowanceMs`, 40 ms): the dive is timed from
           pointer-UP, so the 60-140 ms the gesture takes to travel >=93 px is
           billed to the player. This is real and it is large — modelling a
           median human (tell legible 248 ms + reaction + swipe + touch) put
           them at 17.0% against the briefed 25-45% floor, i.e. only the fast
           tail of players was ever inside the band.

       Both are charged to EVERY sim profile's commit (see `commitFor` in
       scripts/balance.mjs) and both are paid back here, so the two sides move
       together and the measured band is unchanged: the gate profile reads 33.8%
       and the lookahead canary 21.5% before and after. What moves is the median
       human, from 17.0% to 37.9%. This makes the model honest about costs the
       player was already paying; it does not quietly make the game easier.

       (The round-2 pairing of grace 50 / device 25 alone is superseded by this:
       it modelled the touch pipeline but not the swipe, which is the larger of
       the two.)

       Grace is also the ONLY safe way to hand time back. It moves the deadline
       for everyone uniformly and cannot be deferred into: unlike a credit
       against the commit clock, it never lets a player buy information. See the
       `lookahead` probe in scripts/balance.mjs. */
    graceMs: 90,
    /** Dive-commitment latency used by the balance sim's cue-reader bot: it
        cannot act until the telegraph has completed plus this. */
    botReactionMs: 150,
    /** Touch-pipeline latency the sim charges EVERY profile, so the bots pay
        the same delay a real finger does. Pairs with the `graceMs` note above.
        Used only by scripts/balance.mjs — the component measures real time. */
    deviceLatencyMs: 25,
    /** Duration of the swipe gesture itself, likewise charged to every profile.
        The dive is timed from pointer-UP (deliberately — see the `swipe` note
        below on why no credit may be given against the commit clock), so the
        travel time of the gesture is real cost the player pays and the bots
        otherwise would not. Used only by scripts/balance.mjs. */
    swipeAllowanceMs: 40,
  },

  /* -- Swipe -> zone -------------------------------------------------------
     Six zones: 3 columns x 2 heights. The horizontal component of the swipe
     picks the column, the MAGNITUDE picks the height (a flick is a low dive, a
     long throw is a high one), exactly as briefed. Both are resolved into a
     continuous aim point (ax in -1..1 across the goal, ay in 0..1 from grass to
     crossbar) so the dive can also be scored for precision.

     Pixel figures are logical canvas px on a ~407 px wide stage. */
  swipe: {
    /** dx that maps the aim point to a post. */
    halfSpanPx: 78,
    /** Swipe length that reads as a ground-level dive... */
    lowMagPx: 34,
    /** ...and the length that reads as top-corner. */
    highMagPx: 132,
    /** Max |error| in aim units from the zone centre that still counts as a
        perfect-zone-centre dive. Both axes must be inside it. */
    perfectTolerance: 0.14,
    /** Shorter than this and the gesture is treated as a stray tap, not a dive
        — the keeper stays on his line and the shot is still live. */
    minCommitPx: 18,
    /* NOTE — there is deliberately no credit against the commit clock here.
       The dive is timed from the moment it is FINALISED (pointer-up), full
       stop.

       A previous build stamped the commit at the start of the gesture and let
       the zone keep being shaped for 150 ms afterwards, to refund the duration
       of the swipe. That is a 100% win exploit and it was measured as one:
       nudge 18 px at the moment the boot meets the ball, then pick the zone
       while watching ~31% of the actual flight, and the clock still reads the
       nudge — 4,000 runs, 100.0% win, 6.00 saves of 6. It is the `waiter`
       strategy with the reaction penalty refunded.

       Capping the refund does not rescue it. Against a perfect-information
       late-shaper the credit buys reachability almost immediately:

           credit    0ms    20ms   30ms   40ms   60ms   90ms
           win%     61.0   91.8   93.3   98.6  100.0  100.0

       The reveal lands at ~34% of flight and the remaining ~66% is enough to
       reach any zone, so ANY refund against the commit clock is fatal — the
       mechanism is unsafe by construction, not merely mistuned.

       The cost the refund was meant to cover (a swipe takes time) is paid by
       `dive.graceMs` instead, which moves the deadline for everyone and cannot
       be deferred into. `scripts/balance.mjs` carries a `lookahead` probe so
       this exploit class fails the gate if it is ever reintroduced. */
  },

  /* -- Scoring -------------------------------------------------------------
     save 100 (+ streak x 25), risk-shot save 200, perfect zone-centre +50.
     The streak bonus uses the streak BEFORE this save, so the first save of a
     run is a flat 100 and the fifth in a row is 100 + 100. */
  scoring: {
    save: 100,
    riskSave: 200,
    streakBonus: 25,
    perfectBonus: 50,
    /** A goal absorbed by the Shield glove still counts as a save for the win
        line, but pays a flat consolation and does not extend the streak — you
        did not read it, the cover did. */
    shieldSave: 60,
  },

  /* -- Shield glove --------------------------------------------------------
     Three consecutive saves earn one Shield glove; it absorbs the next goal
     that would otherwise be conceded. `maxHeld` is 1 — you can never stockpile
     protection, but a fresh run of three earns a replacement. */
  shield: {
    savesToEarn: 3,
    maxHeld: 1,
  },

  /* -- Pacing (ms) ---------------------------------------------------------
     kickoff + per shot (setUp + cue + flight + outcome + reset) + end beat.
     Measured by scripts/balance.mjs, which adds these up per run: 50 s on an
     average run and 61 s for a full ten-shot one, against a 100 s clock and the
     build standard's 120 s cap. The set-up beat is the walk-back — a penalty
     shootout needs the pause before the run-up or the telegraph has nothing to
     land against. */
  pacing: {
    kickoffMs: 1600,
    setUpMs: 2600,
    outcomeMs: 2100,
    resetMs: 350,
    /** Beat between the run ending on screen and the results screen appearing. */
    endBeatMs: 850,
  },

  /* -- The things you are defending ---------------------------------------
     Drawn as banners on the stand behind the net. Programmatic rounded rects +
     text; no images, no emoji. */
  milestones: [
    { label: "CHILD'S EDUCATION", color: '#FFC845' },
    { label: 'FAMILY HOME', color: '#4ADE80' },
    { label: 'RETIREMENT', color: '#FF8A3D' },
  ],

  /** Human-readable zone names, indexed by zone id. Used for floating text. */
  zoneNames: ['LOW LEFT', 'LOW CENTRE', 'LOW RIGHT', 'TOP LEFT', 'TOP CENTRE', 'TOP RIGHT'],

  fx: {
    saveParticles: 22,
    perfectParticles: 30,
    riskSaveParticles: 34,
    goalParticles: 20,
    shieldParticles: 26,
    winParticles: 40,
    goalShake: 8,
    saveShake: 3,
    hitStopSeconds: 0.07,
    /** Seconds a net ripple / post flash stays lit. */
    netFlashSeconds: 0.7,
    bannerSeconds: 1.4,
    /** Recovery time for squash-and-stretch, fed to the kit's elastic curve.
        The ball is squashed by the boot at the moment of the strike; the keeper
        is squashed by the ground at the moment the dive lands. */
    squashSeconds: 0.2,
  },

  hud: {
    lowTimeSeconds: 15,
  },
};

/**
 * Score the Results ring treats as a full circle.
 *
 * A presentation stretch line, not the win condition (that is `savesToWin`). It
 * has to be REACHABLE, which constrains it hard: the run ends the moment the
 * sixth save lands, so no run can ever contain more than six scoring saves.
 * Brute-forced against the shipped `resolveShot` over all 2^10 save/concede
 * sequences:
 *
 *   theoretical maximum                          1475   (two goals, then six
 *                                                        straight perfect saves —
 *                                                        the early goals push the
 *                                                        streak across BOTH Risk
 *                                                        shots, 4 and 8)
 *   flawless 6-save clean sheet, all perfect     1375
 *   flawless 6-save clean sheet, no perfects     1075
 *   `expert` sim profile, mean of 20,000 runs    1095
 *
 * 1200 sits inside the clean-sheet band: a player who wins without dropping a
 * shot fills the ring by landing roughly half their dives in the zone centre.
 * `scripts/balance.mjs` asserts this value is <= the brute-forced maximum, so it
 * cannot silently become unreachable again when the scoring is retuned.
 *
 * (It was 1600 on the first build — above the 1475 ceiling, so the ring could
 * never close. Caught in review, not by the sim; hence the assertion.)
 */
export const RESULT_TARGET_SCORE = 1200;
