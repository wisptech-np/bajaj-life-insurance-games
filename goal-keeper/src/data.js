// data.js — Goal Keeper tunables.
//
// Every number a designer would want to retune lives here. GoalKeeperGame.jsx
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, rig proportions).
//
// The pure modules src/cover.js and src/rules.js take this object as a
// parameter — they never import it — so scripts/balance.mjs runs the SHIPPED
// rules headless against the SHIPPED numbers.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   ONE LIGHT SOURCE. A single floodlight sits high and to the LEFT of the
   stadium. Everything in the draw path obeys it: lit faces are on the left of
   a form, shade on the right, contact shadows fall down-and-right. There is no
   second key light, no rim light and no arbitrary glow anywhere in this game.

   COLOUR GRAMMAR — five hues, each with exactly one job. Anything that does not
   have a job is drawn in the neutral ink ramp.

     CYAN/BLUE  #00A3E0 -> #1E6BE0   COVER. The span you own, the light it
                                     casts up the pitch, the premium pips.
                                     Nothing else in the game is cyan.
     CRIMSON    #EF4444              RISK. The strikers, the aim crosshairs,
                                     the ball's tracer, a goal conceded.
     GREEN      #28A745              A SAVE, and only a save.
     GOLD       #FFC845              The family's three goals — the banners in
                                     the net and their funding pips.
     WHITE INK  #F4F8FF              Structure: posts, goal line, type.

   Everything else is the neutral ramp (navy sky, two greens of turf), used for
   ground, never for meaning. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  cover: '#00A3E0',
  coverLt: '#7BDCFF',
  coverDeep: '#00527A',
  coverWash: 'rgba(0,163,224,0.20)',
  coverWashLt: 'rgba(123,220,255,0.20)',

  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#8A5D08',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  dangerDeep: '#7F1D1D',

  bgDark: '#0B1221',
  skyTop: '#070F22',
  skyMid: '#0A1A38',
  skyLow: '#0C2450',

  standDark: '#060E1F',
  standLight: 'rgba(120,170,240,0.14)',

  turfLit: '#15693F',
  turfMid: '#0F4E2E',
  turfDark: '#0A3520',
  turfLine: 'rgba(232,246,255,0.40)',

  net: 'rgba(206,228,255,0.18)',
  netLit: 'rgba(206,228,255,0.42)',
  post: '#F4F8FF',
  postShade: '#8FA6C8',

  ball: '#FFFFFF',
  ballShade: '#B9C8DF',
  ballPanel: '#0B1221',

  ink: '#F4F8FF',
  inkDim: 'rgba(244,248,255,0.60)',
  inkFaint: 'rgba(244,248,255,0.28)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',

  /** The floodlight, used for the one gradient the scene is allowed. */
  floodX: 0.18,
  floodY: -0.10,
};

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure modules (src/cover.js, src/rules.js) and therefore by
   scripts/balance.mjs. Every win-rate number quoted below was measured by that
   script against exactly these values.

   THE GAME IN ONE PARAGRAPH. The goal mouth is the interval u ∈ [0,1]. Your
   COVER is a span on it: a centre you steer and a half-width that is your sum
   assured. The half-width is not earned by playing well — it only ever shrinks,
   because a term runs down (`cover.decayPerSec`) and because paying a claim
   draws it down (`cover.claimCost`). The one way to get it back is to RENEW,
   which costs a premium, and premiums arrive on their own slow schedule. The
   whole game is deciding where the span sits and when to spend a premium
   restoring it, while shots you cannot outrun arrive at points you do not
   choose. */
export const GAME_CONFIG = {
  /** Hard cap on the session. The wave plan runs out at `planSeconds`; this is
      the backstop the kit loop counts down and the clock the HUD shows. */
  sessionSeconds: 84,
  /** Length of the generated match. Survive it and you win. */
  planSeconds: 78,

  /* -- The cover span ------------------------------------------------------
     All positions are normalised across the goal mouth: 0 is the left post, 1
     the right post. A ball at u is saved iff |u - centre| <= half.

     `maxHalf` 0.19 means a fully renewed policy covers 38% of the mouth. Two
     shots more than 0.38 apart therefore CANNOT both be covered, however
     perfectly you are positioned — that is under-insurance, and it is the
     reason volleys hurt. See `phases[].spread`.

     `slewPerSec` 0.72 is the speed limit on repositioning: 0.72 of the mouth
     per second. Against the last phase's 360 ms telegraph plus 740 ms flight
     you can cross 0.79 of the mouth, so a far-post shot taken while you sit on
     the other post is reachable but only just, and only if you leave the
     instant the crosshair appears. Cover moves; it does not teleport. */
  cover: {
    maxHalf: 0.22,
    startHalf: 0.22,
    slewPerSec: 0.72,
    /** Cover consumed by paying one claim. A busy save streak costs you width. */
    claimCost: 0.014,
    /** Fraction of maxHalf at impact that still counts as properly insured and
        pays `scoring.plannedBonus`. Scraping a save on the last sliver of a
        lapsing policy is a save, but it is not planning. */
    wideFrac: 0.62,
    /** THE RULE THE WHOLE CONCEPT RESTS ON. Once any live ball is past this
        fraction of its flight, renewal is LOCKED: you cannot buy cover for a
        claim that is already in the air. Steering still works — reacting is
        skill — but the size of your policy is fixed from here. */
    lockFrac: 0.55,
    /** Premiums to restart a policy that has run all the way to zero. A lapsed
        policy is re-underwritten, not simply paid up; letting the term expire
        is cheap right up until it is the most expensive thing on the screen. */
    lapseRestartCost: 2,
  },

  /* -- Premiums ------------------------------------------------------------
     The currency of renewal. You hold at most three, and one arrives every
     `refillSeconds`. Sitting at the cap wastes the next refill, so hoarding is
     punished as surely as overspending: the correct play is to let a policy run
     down and renew it just before the shot you can see coming — which is
     exactly the window `cover.lockFrac` starts closing. */
  premium: {
    maxHeld: 3,
    startHeld: 3,
    refillSeconds: 2.5,
  },

  /* -- What you are defending ---------------------------------------------
     Three goals along the mouth, each owning a third of it. A conceded ball
     costs one pip from whichever goal's third it went through. Lose EVERY pip
     on ANY ONE goal and the match is over — spreading the damage is a real
     decision, and it is the reason the span's position matters beyond the
     shot in front of you. */
  goals: [
    { key: 'education', label: "CHILD'S EDUCATION", short: 'EDUCATION', u: 1 / 6 },
    { key: 'home', label: 'FAMILY HOME', short: 'HOME', u: 3 / 6 },
    { key: 'retirement', label: 'RETIREMENT', short: 'RETIREMENT', u: 5 / 6 },
  ],
  livesPerGoal: 6,

  /* -- Difficulty ramp -----------------------------------------------------
     Five named phases, announced on screen as they arrive. Each tightens three
     separate screws at once:

       - the shot gets faster    (telegraphMs + flightMs shrink: 1710 ms of
                                  warning in phase 1, 1100 ms in phase 5)
       - the policy runs down faster (decayPerSec nearly doubles)
       - the volleys get wider   (ballsMax and spread grow past 2 x maxHalf)

     `spread` is the normalised gap between consecutive balls in a volley. Full
     cover is 0.38 wide, so a two-ball volley at spread 0.30 is coverable and
     one at 0.46 is not: some volleys are a positioning problem and others are
     a choice about which family goal takes the hit.

     `doubleChance` is the chance a wave carries a second ball; `triple` the
     chance a double becomes a triple. A three-ball volley can never be fully
     covered, by construction, which is why it only appears in the last two
     phases and never often. */
  phases: [
    { name: 'WARM UP', untilSec: 15, gapMs: [2300, 2650], doubleChance: 0.00, triple: 0.00, telegraphMs: 600, flightMs: 1200, decayPerSec: 0.0150, spread: [0.22, 0.30] },
    { name: 'PRESSURE', untilSec: 31, gapMs: [2150, 2500], doubleChance: 0.30, triple: 0.00, telegraphMs: 520, flightMs: 1060, decayPerSec: 0.0205, spread: [0.22, 0.32] },
    { name: 'SQUEEZE', untilSec: 47, gapMs: [2050, 2400], doubleChance: 0.45, triple: 0.00, telegraphMs: 470, flightMs: 960, decayPerSec: 0.0250, spread: [0.24, 0.34] },
    { name: 'VOLLEY', untilSec: 63, gapMs: [1950, 2300], doubleChance: 0.58, triple: 0.08, telegraphMs: 420, flightMs: 870, decayPerSec: 0.0290, spread: [0.25, 0.37] },
    { name: 'FULL TIME', untilSec: 78, gapMs: [1900, 2200], doubleChance: 0.66, triple: 0.11, telegraphMs: 380, flightMs: 790, decayPerSec: 0.0325, spread: [0.26, 0.40] },
  ],

  /** Balls never target the outer `edgeInset` of the mouth — a shot at u = 0.005
      is unsaveable noise rather than difficulty, because half the span would
      hang off the post. */
  edgeInset: 0.07,

  /* -- Scoring -------------------------------------------------------------
     A save is 100. Consecutive saves add `streakBonus` each, capped so a long
     quiet phase cannot run away with the run. `plannedBonus` is the one that
     carries the message: it pays only when the policy was still wide at the
     moment of the claim. */
  scoring: {
    save: 100,
    streakBonus: 15,
    streakCap: 12,
    plannedBonus: 50,
    /** Paid per family goal that finishes the match with every pip intact. */
    goalIntactBonus: 250,
    /** Paid once for reaching full time with all three goals still standing. */
    survivalBonus: 400,
  },

  /* -- Pacing (ms) --------------------------------------------------------- */
  pacing: {
    /** Quiet beat before the first wave, used for the on-canvas coach marks. */
    kickoffMs: 2600,
    /** Beat between full time on screen and the results screen appearing. */
    endBeatMs: 1000,
  },

  fx: {
    saveParticles: 18,
    plannedParticles: 26,
    goalParticles: 22,
    renewParticles: 16,
    goalShake: 8,
    saveShake: 2,
    hitStopSeconds: 0.05,
    bannerSeconds: 1.5,
    lockFlashSeconds: 0.45,
    squashSeconds: 0.2,
  },

  hud: {
    lowTimeSeconds: 15,
    lowCoverFrac: 0.42,
    /** Anti pause-scum: leaving the tab freezes the world, and coming back
        holds it behind a visible 3-2-1 before live input resumes. A reaction
        game that resumes instantly can be scrubbed a frame at a time. */
    reacquireFreezeSeconds: 1.5,
    reacquireLockSeconds: 0.25,
  },
};

/**
 * Score the Results ring treats as a full circle.
 *
 * A presentation stretch line, not the win condition (that is surviving the
 * plan). It has to be REACHABLE: scripts/balance.mjs prints the best score its
 * skilled bot achieved over the whole sweep and fails the gate if this value is
 * above it, so the ring can never silently become impossible to close.
 */
export const RESULT_TARGET_SCORE = 9000;
