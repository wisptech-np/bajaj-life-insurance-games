// data.js — Premium Pinball tunables.
//
// Every number a designer would want to retune lives here. table.js turns the
// geometry block into segments/circles, physics.js integrates the ball against
// them, and engine.js owns the run state machine. None of those three touch the
// DOM, so scripts/balance.mjs drives the SHIPPING rules rather than a copy.
//
// Units are logical table pixels (the table is authored at 400x640 and letter-
// boxed onto the canvas) and seconds.

import { BALANCE } from './kit/config.js';

/* ─── Palette ────────────────────────────────────────────── */
export const COLORS = {
  blue: '#003DA6',
  blueLt: '#1E6BE0',
  blueSky: '#3B8DD4',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  bg: '#0B1221',
  bgMid: '#0A1E42',
  bgLow: '#061229',
  rail: '#6E93C6',
  railLt: '#BFD8F5',
  steel: '#8FB8E8',
  ball: '#E8F1FF',
  white: '#FFFFFF',
};

/* ─── Goal bumper identities ─────────────────────────────── */
// Short labels are what the canvas paints inside the bumper cap; `full` is the
// tutorial/HUD copy. No emoji anywhere — every sprite is drawn programmatically.
export const GOALS = [
  { key: 'education', short: 'EDU', full: 'Education', color: '#1E6BE0', colorLt: '#7FB6FF' },
  { key: 'home', short: 'HOME', full: 'Home', color: '#F26522', colorLt: '#FFB37A' },
  { key: 'retirement', short: 'RETIRE', full: 'Retirement', color: '#28A745', colorLt: '#7BE8A0' },
];

/** Rollover lane identities, left to right. */
export const LANES = [
  { key: 'life', label: 'LIFE' },
  { key: 'health', label: 'HEALTH' },
  { key: 'savings', label: 'SAVE' },
];

export const GAME_CONFIG = {
  sessionSeconds: 120,
  balls: 3,

  /* ---- Table geometry (authored space) --------------------------------- */
  table: {
    W: 400,
    H: 640,

    // Playfield box. The plunger lane lives to the right of `pfR`.
    pfL: 14,
    pfR: 352,
    top: 44,
    cornerR: 70,

    // Plunger lane.
    laneL: 352,
    laneR: 386,
    laneFloorY: 612,
    laneInnerBottomY: 612,

    // One-way gate across the top of the plunger lane: a launched ball flies
    // through it, a returning ball bounces off it. It is deliberately SLOPED
    // (left end lower) and its left end overhangs the lane wall, because a
    // level gate is a shelf — the sim found balls parking on it and running
    // the stuck watchdog down. Sloped, a resting ball rolls off the low end
    // and drops into the playfield where it belongs.
    // The inner wall's top must sit clearly BELOW the gate's low end, or its
    // endpoint pokes through the gate and a ball can balance on that tip — an
    // endpoint contact normal points straight up, which cancels gravity on its
    // own. The surviving gap (about 14 px) is still under a ball diameter, so
    // nothing can slip past the gate into the lane.
    gateY: 120,          // where the lane's inner wall stops
    gateX0: 346,
    gateY0: 106,
    gateY1: 92,

    // Lower funnel: a single wall from (pfL, slantTopY) to (slantX, slantBotY).
    // It ends there. Nothing reaches down to the flipper.
    //
    // That end point is load-bearing and is verified, not assumed: table.js
    // exports minWallFlipperClearance(), which measures every wall segment
    // against the flipper axis across the WHOLE sweep, and scripts/balance.mjs
    // fails the gate unless it exceeds ball radius + flipper radius. Below that
    // figure a ball can touch a wall and a flipper at the same instant, and if
    // the two contact normals have opposing horizontal components they cancel
    // and hold the ball until the stuck watchdog kills it.
    //
    // Two earlier layouts failed exactly there. Both were checked against the
    // RESTING flipper only, and the flipper does not stay at rest — holding it
    // up is a documented control and standard cradle technique. Raised, the
    // flipper swept up into the wall and re-opened the wedge: a cradling bot
    // lost 82.9% of its balls to the stuck watchdog at (105,520) and (260,520)
    // and won 5% of runs. Clearing the entire sweep, rather than one pose,
    // is the only version of this constraint that means anything.
    //
    // Ending the funnel above the flipper also gives each side a real OUTLANE:
    // a ball that rolls off the wall slowly, or meets a raised flipper, falls
    // past the flipper and drains. That is what stops a held flipper roofing
    // the drain and turning the session into a scoreless timeout.
    slantTopY: 430,

    // The funnel's lower end is specified in POLAR coordinates about the flipper
    // pivot, not as a loose (x, y), because its only real constraint is its
    // distance from the flipper. Clearance from the raised flipper works out to
    //     funnelEndR * sin(funnelEndDeg - |upAngle|)
    // = 52 * sin(65 - 29.79) = 30.0 px, over the 26 px (two ball radii plus the
    // flipper radius) at which a ball can no longer touch wall and flipper at
    // the same instant. Tying it to the pivot means retuning the flipper moves
    // the funnel with it instead of silently reopening the wedge.
    //
    // 65 degrees puts the end above the flipper's mid-span, so a ball rolling
    // off it lands ON the flipper. An earlier attempt ended the funnel outboard
    // of the pivot: clearance was fine, but nearly every ball rolled straight
    // past into the outlane and the bot won 3.3% of runs.
    funnelEndR: 52,
    funnelEndDeg: 65,

    // Slingshot, built as a BULGE on the funnel wall rather than a free-standing
    // triangle. Two points on the wall, an apex pushed into the playfield. This
    // removes the sub-ball-width corridor a free-standing slingshot leaves
    // between itself and the wall, and it keeps the kicker where a slingshot
    // belongs — on the way down to the flipper.
    slingStartFrac: 0.42,
    slingEndFrac: 0.76,
    slingApexOut: 30,

    // Rollover lane band.
    rolloverTopY: 112,
    rolloverBotY: 154,
    rolloverLineY: 150,
    rolloverX0: 60,
    rolloverX1: 306,

    // Goal bumpers (order matches GOALS).
    bumpers: [
      { x: 108, y: 268, r: 22 },
      { x: 183, y: 206, r: 24 },
      { x: 258, y: 268, r: 22 },
    ],

    // Drain mouth: below this line, inside the playfield, the ball is lost.
    drainY: 604,
  },

  /* ---- Ball ------------------------------------------------------------ */
  ball: {
    radius: 9,
    trailSeconds: 0.02,
  },

  /* ---- Physics --------------------------------------------------------- */
  physics: {
    // Table pitch: a pinball playfield is tilted ~6.5 degrees, so the effective
    // downhill acceleration is a fraction of full gravity. 0.55 is the brief's
    // figure and reads as a heavy steel ball rather than a bouncing balloon.
    gravity: BALANCE.physics.gravity * 0.55, // 880 px/s^2

    // Hard ceiling on ball speed, applied after every impulse. Free fall down
    // the whole table tops out near 1030 px/s, so this only ever bites on a
    // flipper or bumper impulse — which is exactly the energy-inject clamp the
    // brief asks for.
    maxSpeed: 1500,

    // Continuous-ish integration: each fixed 1/120 s tick is split so no
    // substep moves the ball more than `substepPx`. At the 1500 px/s ceiling a
    // tick travels 12.5 px, which is ceil(12.5 / 3.2) = 4 substeps — the
    // brief's "at least 4 substeps at terminal velocity". 3.125 px of travel
    // against an 9 px ball radius leaves no way through a zero-thickness
    // segment, and scripts/balance.mjs asserts that with a crossing test.
    substepPx: 3.2,
    minSubsteps: 4,
    maxSubsteps: 16,

    wallRestitution: 0.55,
    bumperRestitution: 1.15,
    slingRestitution: 0.98,
    flipperRestitution: 0.34,

    // Coulomb friction coefficient: the tangential impulse is capped at
    // frictionMu x the normal impulse.
    //
    // It must NOT be a flat "retain 94% of tangential speed per contact". A
    // ball resting on a slope re-contacts every substep — 480 contacts a second
    // — so a per-contact retention factor compounds to total grip and the ball
    // welds itself to the first ramp it touches. The balance sim found it as
    // balls dying on the stuck watchdog at the flipper shoulder. Scaling the
    // friction with the normal impulse makes a resting contact almost
    // frictionless and a hard impact properly grippy, which is also what a
    // steel ball on a lacquered playfield actually does.
    frictionMu: 0.12,

    // Fixed outward impulses. The bumper pop is what makes the goal cluster
    // feel alive; the slingshot kick is what keeps the ball off the flippers.
    bumperKick: 190,
    slingKick: 300,

    // Two separate rearms, because they do different jobs.
    //
    // hitCooldown gates the POP: how soon a bumper will kick the ball again.
    // It stays short so a ball working the goal cluster keeps getting thrown
    // around — that is the whole feel of a bumper.
    //
    // scoreCooldown gates the POINTS. It is much longer, and it is the lever
    // that decouples score from session length: a ball rattling in the cluster
    // still bounces beautifully, it just does not bank 50 points per contact.
    // Without the split, slowing scoring meant a bumper that stopped kicking
    // for half a second at a time, which reads as a dead post.
    hitCooldown: 0.09,
    scoreCooldown: 0.75,

    // Mild air drag so a rattling ball eventually settles instead of pinging
    // between two bumpers for the rest of the session.
    drag: 0.9975,

    // Settle wobble: a slow alternating horizontal micro-acceleration, applied
    // only to a ball that has almost stopped.
    //
    // Coulomb friction holds a ball on any slope shallower than atan(mu) = 6.8
    // degrees, which includes the top of a flipper's round pivot cap. That is
    // correct physics and it produced a real, permanent rest — the sim caught a
    // ball balanced 17 px directly above a pivot, once in ~200 runs, dying on
    // the stuck watchdog. A real cabinet breaks that balance with the vibration
    // and lean that every physical table has; a perfectly level, perfectly
    // still table is the pathological case, not the realistic one.
    //
    // It ALTERNATES rather than pushing one way: a constant bias would just
    // press the ball into whatever it was resting against and trade one trap
    // for another, and a fixed direction would break left/right symmetry.
    //
    // The governing condition is NOT the friction cone. Two earlier
    // derivations both failed audit: g*mu (105.6) starts the ball moving but
    // too slowly to reset the stuck watchdog, and g*mu*(1+e) (163.7) is wrong
    // outright — the sustained normal impulse of a resting contact converges
    // to exactly weight regardless of restitution (measured identical at
    // e = 0.00..1.15), because the time-averaged impulse must balance gravity.
    // What actually has to hold is that the wobble's PEAK SLIDING SPEED beats
    // the watchdog's stuck threshold:
    //     v_peak = (A/w) * (2*sqrt(1-k^2) - k*(PI - 2*asin(k)))
    //     with k = g*mu/A, w = 2*PI*settleHz,  must exceed
    //     watchdog.stuckSpeed (20 px/s) with margin.
    // At A=185, Hz=0.7: v_peak = 22.8 px/s — ~4% amplitude margin over the
    // true boundary (~178). The margin is thin and depends on settleHz too
    // (A=185 at Hz=0.9 FAILS), so balance.mjs asserts the closed form every
    // run; retune any of settleAccel / settleHz / frictionMu / stuckSpeed and
    // the gate recomputes it.
    // History: at the original 90 a ball could sit on the top endpoint of a
    // rollover lane post at (223.87, 103.00) — a single contact tilted 0.85
    // degrees off vertical — and the wobble could never break it: 6 watchdog
    // deaths in 6,047 ball losses over 2,400 runs. At 185: 0 in 9,272, and an
    // exhaustive 12,561-placement rest sweep (every endpoint cap, pivot/tip
    // caps, bumper caps, tilts -12..+12 deg, three flipper poses) finds 0
    // permanent rests (689 remain at 164).
    //
    // Cost of the amplitude, measured over those runs: active on 0.30% of
    // play ticks, peak sliding speed 22.1 px/s = 0.37 logical px/frame at
    // 60fps, largest x-drift in any episode 12.7 px over 6s — it reads as a
    // ball slowly rolling off what it landed on, not a slide.
    settleSpeed: 45,   // px/s below which the wobble applies at all
    settleAccel: 185,  // px/s^2 amplitude; v_peak(185, 0.7Hz) = 22.8 > 20
    settleHz: 0.7,     // full cycles per second; part of the v_peak invariant
  },

  /* ---- Plunger --------------------------------------------------------- */
  plunger: {
    restX: 369,
    restY: 601,
    chargeSeconds: 0.95,   // hold time from 0 to full power
    minSpeed: 1000,        // just clears the top arc
    maxSpeed: 1120,        // rides the arc deep into the left rollover lane
    autoSeconds: 6,        // un-plunged ball launches itself so the clock is fair
    // Beat between a drain and the next ball. Long enough to read the banner
    // that says what just happened (lost / Cover Note / served fresh), and it
    // is session time that carries no scoring, which is the cheapest honest way
    // to lengthen a session without making the game easier.
    serveDelay: 2.4,
  },

  /* ---- Flippers -------------------------------------------------------- */
  flipper: {
    // pivotDX and length together set the drain mouth between the tips, the
    // strongest single lever on difficulty.
    //
    // (Historical, PRE-Cover-Note table — kept only to show the lever's
    // slope; none of these cells describes the shipped game. 200 runs/cell:
    //   mouth  26.8px -> 55.0 / 39.0 / 36.0 %
    //   mouth  34.8px -> 45.5 / 43.0 / 38.0 %
    //   mouth  42.8px -> 35.5 / 26.0 / 23.0 %
    //   mouth  50.8px -> 29.5 / 22.5 / 22.0 %
    //   mouth  58.8px -> 25.5 / 21.5 / 18.5 % )
    //
    // Re-tuned once more after the Cover Note ball save landed (which lifted
    // every win rate by ~25 points) and after scoreCooldown was introduced to
    // decouple scoring from session length. Final sweep over
    // (mouth x scoreCooldown x saveWindow x serveDelay), 90 runs x 4 seed
    // blocks x 3 hold profiles per cell, picked mouth 63 px: it has the widest
    // margin under the 45% ceiling AND the longest sessions of any in-band
    // cell (tap 35.8%, median session 46 s).
    pivotDX: 88,           // from playfield centre
    pivotY: 542,
    length: 56,
    radius: 8,
    restAngle: 0.52,       // radians below horizontal, tip low
    upAngle: -0.52,        // tip high
    angularSpeed: 17.5,    // rad/s => ~60 ms sweep
  },

  /* ---- Scoring --------------------------------------------------------- */
  scoring: {
    targetScore: 3000,
    bumper: 50,
    sling: 25,
    rollover: 75,
    allGoals: 500,         // all three goal bumpers hit on one ball
    comboWindow: 1.5,      // seconds; chained hits inside this grow the combo
  },

  /* ---- Bonus Secure ---------------------------------------------------- */
  bonus: {
    seconds: 8,
    multiplier: 2,
  },

  /* ---- Cover Note (ball save) ------------------------------------------
     A drain inside the first `seconds` of a ball is re-served free, once per
     ball. Two reasons, one mechanical and one thematic:

     * This table's outlanes are undefendable by construction — they are the
       same geometry that stops a held flipper roofing the drain — so 42% of
       drains are losses the player could not have prevented. A short save
       window turns the cheapest of those into a second chance instead of a
       shrug.
     * Median session was 26.9s with a fifth of sessions ending inside 20s,
       well under the 60-120s GAME_STANDARD asks for. The save is a better
       lever than simply widening the drain mouth, which buys length only by
       making every ball easier and pushed the tap profile past its band.

     Thematically it is the grace period on a missed premium: cover does not
     lapse the instant you are late. */
  ballSave: {
    seconds: 9,
    perBall: 1,
  },

  /* ---- Watchdogs (never reached in normal play) ------------------------- */
  watchdog: {
    stuckSpeed: 20,        // px/s
    stuckSeconds: 3.5,
    maxBallSeconds: 70,
  },

  /* ---- Effects --------------------------------------------------------- */
  fx: {
    bumperParticles: 14,
    slingParticles: 10,
    laneParticles: 12,
    flipParticles: 8,
    drainParticles: 16,
    bonusParticles: 20,
    winParticles: 26,
    loseParticles: 18,
    bumperShake: 2.4,
    drainShake: 7,
    hitStopSeconds: 0.05,
    bannerSeconds: 1.5,
    bumperFlashSeconds: 0.32,
    laneFlashSeconds: 0.5,
  },

  /* ---- HUD ------------------------------------------------------------- */
  hud: {
    lowTimeSeconds: 15,
    endBeatMs: 700,
  },
};

/** Target used by the results screen ring. */
export const RESULT_TARGET_SCORE = GAME_CONFIG.scoring.targetScore;

/** Scoring ladder shown on the How to Play screen. */
export const SCORE_LADDER = [
  { key: 'bumper', label: 'Goal bumper', value: `+${GAME_CONFIG.scoring.bumper}` },
  { key: 'rollover', label: 'Rollover lane', value: `+${GAME_CONFIG.scoring.rollover}` },
  { key: 'sling', label: 'Slingshot', value: `+${GAME_CONFIG.scoring.sling}` },
  { key: 'allGoals', label: 'All 3 goals, one ball', value: `+${GAME_CONFIG.scoring.allGoals}` },
];
