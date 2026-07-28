// data.js — Wealth Balloon tunables.
//
// Every number a designer would want to retune lives here. rounds.js (the pure
// game model) and WealthBalloonGame.jsx (the canvas component) read from this
// file and never hard-code gameplay values; the only constants in the component
// are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.
//
// scripts/balance.mjs imports THIS file and src/rounds.js — the modules that
// ship — so every measured number quoted below is measured against the game the
// player actually gets.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar: BLUE is a young, safe balloon and everything protective (the
   Term Shield, the banked total). ORANGE is heat — the honest tell, the moment
   the balloon starts telling you it has had enough. RED is the burst and the
   needle drones. GREEN is progress toward the target, so green always means
   "you are winning" and never means a hazard. GOLD is banked wealth. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  skyLt: '#7FB6FF',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  steel: '#8FA6C4',
  steelLt: '#D6E4F7',

  bgDark: '#0B1221',
  skyTop: '#0A1E42',
  skyMid: '#0B2450',
  skyLow: '#061229',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* Balloon skin ramp. The balloon is drawn as a gradient-filled path and its
   colour is lerped along these three stops by the tell intensity: calm blue
   while it is safe, orange once the honest tell has started, red at the top of
   the warning. The ramp IS the tell — it is not decoration. */
export const SKIN = {
  calm: { core: [122, 186, 255], mid: [30, 107, 224], deep: [0, 45, 122] },
  warm: { core: [255, 205, 150], mid: [242, 101, 34], deep: [150, 44, 8] },
  hot: { core: [255, 190, 190], mid: [239, 68, 68], deep: [120, 12, 12] },
};

/* ─── Gameplay configuration ──────────────────────────────
   Lengths are seconds; every spatial quantity is in FIELD UNITS — fractions of
   the canvas width — so the round model is resolution independent and the
   headless sim measures the same geometry the phone renders. */
export const GAME_CONFIG = {
  /** Hard session cap. Six rounds take ~30 s of held time, so this is slack. */
  sessionSeconds: 120,
  rounds: 6,

  /* -- The value curve ----------------------------------------------------
     value = coefficient x heldSeconds ^ exponent. Superlinear: the last second
     of a hold is worth far more than the first, which is what makes letting go
     hard. At the 2.2 s floor a balloon is worth 35; at the 4.6 s ceiling, 115. */
  value: { coefficient: 10, exponent: 1.6 },

  /* -- Hidden burst threshold ---------------------------------------------
     Drawn uniform per round. The player never sees it; the tell below is the
     only honest information about it. */
  burstThreshold: { minSeconds: 2.2, maxSeconds: 4.6 },

  /* -- The tell -----------------------------------------------------------
     Wobble + hue shift start at `fraction` of the threshold, offset by uniform
     noise of +/- `jitterSeconds`. Honest but noisy: seeing the tell at time
     `tau` puts the threshold inside [tau/0.7 - 0.5, tau/0.7 + 0.5], a one-second
     window. Because 0.3 x 2.2 s = 0.66 s > 0.35 s, the tell ALWAYS precedes the
     burst by at least 0.31 s — there is no round where the balloon pops without
     warning. `minLeadSeconds` enforces that invariant explicitly.

     `rampSeconds` is presentation only: how long the wobble takes to reach full
     intensity after onset. */
  tell: {
    fraction: 0.7,
    jitterSeconds: 0.35,
    earliestSeconds: 0.35,
    minLeadSeconds: 0.25,
    rampSeconds: 0.55,
  },

  /* -- Term Shield --------------------------------------------------------
     ONE per game, auto-applied to the first burst: it banks half of the value
     the balloon held at the instant it popped. It rescues the money, not the
     momentum — the compounding streak below still resets.

     `keepsStreak: false` is that decision, and it is measured rather than felt.
     `node scripts/balance.mjs --runs 20000 --shield-keeps-streak` runs the
     variant where cover rescues both: across the whole band of targets where
     the disciplined bot stays inside its 30-50% gate (~495-518) the greedy bot
     measures 15.7-19.3%, never clearing the 15% ceiling. NOTE the margin — the
     best it reaches is 15.7%, only 0.7 pp over the line, so this variant is
     excluded by a whisker rather than by a mile. Treat it as a retune hazard:
     anything that moves the compounding bonus or the drone schedule should
     re-run that flag before assuming the decision still holds.

     Worth 0.9 of an average banked round: ~36 points against a 40-point bank. */
  shield: { count: 1, absorbFraction: 0.5, keepsStreak: false },

  /* -- Compounding bonus --------------------------------------------------
     Consecutive banked rounds add bonusPerStep x (streak - 1), capped at
     maxSteps. A perfect six-round run earns 0+18+36+54+72+90 = 270 on top of
     the ~243 of banked value. Any burst resets the streak to zero.

     This term is a CORRECTION to the published spec and it is load-bearing —
     see okf-brain/wealth-balloon/log.md for the derivation. Without it, six
     independent rounds where a burst costs only that round's value make greed
     the BETTER strategy, not merely an unpunished one: holding to 95% of the
     threshold banks 1.63x more per surviving round ((0.95/0.7)^1.6) against a
     burst rate that can never exceed 50% for any uniform threshold.

     Measured, `--runs 20000 --bonus 0`: the greedy bot's mean (241) exceeds the
     disciplined bot's (233), and from target 240 upward it wins MORE often at
     every target. The disciplined gate pins the win line into ~235-252; greedy
     scores 45-52% across that whole window. Greedy only falls under 15% at
     target 330, where the disciplined bot is at 1.0%. No win line exists that
     satisfies both of the spec's gates.

     The bonus prices consistency instead of nerve, which is also the pitch. */
  compound: { bonusPerStep: 18, maxSteps: 5 },

  /* -- Balloon geometry (field units = fractions of canvas width) ----------
     Radius grows linearly with held time and tops out at the 4.6 s ceiling, so
     a balloon you have pushed is visibly, dangerously fat — which is what makes
     the needle drones below a greed tax rather than a coin flip. */
  balloon: {
    centreX: 0.5,
    centreYFrac: 0.53,
    minRadius: 0.075,
    maxRadius: 0.30,
    fullSeconds: 4.6,
    /** Neck + knot below the envelope, x radius. Drawing only. */
    neckFrac: 0.22,
  },

  /* -- Needle drones ------------------------------------------------------
     From round 4 a drone drifts across the sky on a fixed lane, offset above or
     below the balloon's centre. Releasing while one overlaps the envelope pops
     it regardless of the threshold.

     WHAT THE LANE OFFSET ACTUALLY DOES (0.195 of the canvas width). The
     envelope reaches the lane at t = 2.044 s, which is INSIDE a normal
     disciplined balloon, not outside it: the disciplined bot's release times run
     p25 1.93 s / median 2.38 s / p75 2.83 s, so 69% of its releases already
     cover the lane. A greedy balloon covers it on 94% of releases. So the lane
     is not a wall that only greed runs into; it is a hazard a disciplined player
     is usually exposed to and a greedy one is essentially always exposed to.

     The drones' dominant effect is therefore a FLAT difficulty knob, and it is
     large: `--runs 20000 --no-drones` moves the disciplined bot 38.5% -> 61.8%
     and the ceiling bot 77.1% -> 94.2%. The size gradient is real but secondary
     — single-drone overlap at a random release instant is 9.9% for a 2.4 s
     balloon against 18.7% for a 3.2 s one, which lands as a per-round pop rate
     of 6.0% (disciplined) against 6.9% (greedy). Those look nearly flat because
     greed loses 34.5% of its rounds to the threshold before a release ever
     happens; conditional on actually reaching a release it is 6.0% against
     10.5%, a 1.7x tax.

     `needleExposure()` in the sim prints 13.7% / 24.1% for the same two balloons
     because it averages over the three drone rounds and round 6 flies two.

     `span` is the wrap length of a drone's sweep, in field units, and
     `spanStart` its left edge — a drone flies from off-screen to off-screen and
     re-enters, so it is always somewhere the player can see and time. */
  needles: {
    tipRadius: 0.02,
    span: 1.7,
    spanStart: -0.35,
    /** Per round (0-based). null = clear skies. */
    schedule: [
      null,
      null,
      null,
      [{ speed: 0.30, offset: 0.195 }],
      [{ speed: 0.34, offset: -0.195 }],
      [{ speed: 0.30, offset: 0.195 }, { speed: 0.36, offset: -0.185 }],
    ],
  },

  /* -- Scoring / win line -------------------------------------------------
     BALANCE (measured — `node scripts/balance.mjs`; the sim imports
     src/rounds.js and this file, it does not re-implement the rules). Figures
     below are the 20,000-run estimates, seed 0xBA110032; the 500-run gate is
     the same numbers with a ±4 pp sampling window:

       bot                                          win%  mean  p25  p75  bursts
       disciplined (lets go on the tell, s=0.3s)    38.5%   454  398  521   0.4
       greedy      (holds to 95% of the tell's read) 8.7%   298  202  376   2.5
       blind-70    (fixed 2.38 s, never looks)      21.1%   376  284  494   0.9
       blind-95    (fixed 3.23 s, never looks)       4.8%   254  163  322   3.0
       ceiling     (holds to the tell's safe bound) 77.1%   546  507  604   0.2

     At 500 runs the default seed gives disciplined 43.2% / greedy 7.8%; across
     five other seeds, 34.8-41.6% and 7.2-11.2%. The gate is not sitting on one
     lucky sample, but quote the 20k column when a number matters.

     WHY 500. Both gates hold simultaneously only for a win line in [481, 514]
     (measured at 20k: the disciplined bot crosses 50% at ~481 and 30% at ~514;
     greedy drops under 15% from ~439 up). 500 sits near the centre of that
     33-point window, just above the disciplined bot's mean, so a losing run
     reads as one burst short rather than hopeless. Note the spec's published
     320 is not merely low under these rules, it is trivial: the disciplined bot
     wins 88.1% of runs at 320. */
  scoring: { targetScore: 500 },

  fx: {
    burstShake: 8,
    needleShake: 9,
    hitStopSeconds: 0.07,
    inflateParticles: 3,
    bankParticles: 18,
    shieldParticles: 24,
    burstParticles: 26,
    needleParticles: 30,
    winParticles: 40,
    bannerSeconds: 1.5,
    /** Seconds the round-result card stays up before the next round arms. */
    roundBeatSeconds: 1.25,
  },

  hud: {
    /** Beat between the run ending on screen and the results screen appearing. */
    endBeatMs: 700,
    lowTimeSeconds: 15,
  },
};

/** Value of a balloon held for the shortest / longest possible threshold. */
export const VALUE_FLOOR = Math.round(
  GAME_CONFIG.value.coefficient
  * GAME_CONFIG.burstThreshold.minSeconds ** GAME_CONFIG.value.exponent,
);
export const VALUE_CEILING = Math.round(
  GAME_CONFIG.value.coefficient
  * GAME_CONFIG.burstThreshold.maxSeconds ** GAME_CONFIG.value.exponent,
);

/** Score the Results ring treats as a full circle: the win line itself. */
export const RESULT_TARGET_SCORE = GAME_CONFIG.scoring.targetScore;
