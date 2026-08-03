// data.js — Perfect Premium tunables.
//
// Every number a designer would want to retune lives here. src/cover.js (the
// pure rules module) and PerfectPremiumGame.jsx read from this file and never
// hard-code gameplay values; the only constants in the component are drawing
// details (stroke widths, glyph geometry, HUD offsets).
//
// This file is intentionally import-free and browser-free so that
// scripts/balance.mjs can import it under Node exactly as the app does.
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for the cover field:
     BLUE/CYAN  — your cover. The line you steer and the shaded band beneath it
                  ("everything under here is protected").
     GREEN      — a claim that landed inside the shaded band. Covered.
     GOLD       — precision and free money: a PERFECT (tight) cover, the combo,
                  and the goal tokens that only a low cover line can reach.
     ORANGE     — a major claim inbound, and the budget meter draining.
     RED        — a shortfall. Only ever means cover that was not there. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  cyan: '#3FD8E8',
  cyanLt: '#9BF3FF',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  greenDeep: '#0E5C24',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  stageTop: '#0A1E42',
  stageMid: '#0B2450',
  stageLow: '#061229',

  track: 'rgba(255,255,255,0.10)',
  trackEdge: 'rgba(255,255,255,0.22)',
  rail: 'rgba(255,255,255,0.14)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Claim classes ───────────────────────────────────────
   The whole game is a bet against these three distributions. A claim's CLASS is
   visible the moment it appears on the horizon — its colour, its glyph and the
   fogged band between `lo` and `hi`. Its actual size is drawn uniformly inside
   that band and is only revealed `field.revealSeconds` before it lands.

   That is the entire uncertainty model, and it is deliberately honest: the
   player always knows the range and never knows the number, which is exactly
   the position anyone buying cover is in. Carrying `hi` is always safe and
   always wastes budget; carrying `lo` is always cheap and sometimes ruinous. */
export const RISK_CLASSES = [
  {
    id: 'routine',
    label: 'Routine claim',
    short: 'ROUTINE',
    lo: 0.10,
    hi: 0.24,
    color: '#1E6BE0',
    colorLt: '#7FB2FF',
  },
  {
    id: 'major',
    label: 'Major claim',
    short: 'MAJOR',
    lo: 0.30,
    hi: 0.56,
    color: '#F26522',
    colorLt: '#FFB07A',
  },
  {
    id: 'critical',
    label: 'Critical claim',
    short: 'CRITICAL',
    lo: 0.55,
    hi: 0.88,
    color: '#EF4444',
    colorLt: '#FF9A9A',
  },
];

/* ─── The life timeline ───────────────────────────────────
   Eight chapters from the first policy year at 25 to the vesting date at 60.
   Each chapter is a stretch of continuous play, not a menu: `seconds` of claims
   arriving on `gap` spacing, drawn from that chapter's `weights`.

   The shape of the run is the argument: early years are cheap and calm, which
   is exactly when a surplus can be banked; the last three years are dense with
   major and critical claims and no amount of in-the-moment reacting pays for
   them. What pays for them is the budget you did not burn at 25. */
export const YEARS = [
  {
    age: 25,
    label: 'first pay cheque',
    note: 'Small claims only. Bank the surplus — you will need it at 55.',
    seconds: 9.5,
    gap: [1.50, 1.95],
    weights: { routine: 1, major: 0, critical: 0 },
    goalChance: 0.3,
  },
  {
    age: 29,
    label: 'first job raise',
    note: 'More income, and the first claim that needs real cover.',
    seconds: 9.5,
    gap: [1.42, 1.85],
    weights: { routine: 0.78, major: 0.22, critical: 0 },
    goalChance: 0.3,
  },
  {
    age: 33,
    label: 'wedding year',
    note: 'A second life on the policy. Majors get common.',
    seconds: 10,
    gap: [1.35, 1.75],
    weights: { routine: 0.6, major: 0.4, critical: 0 },
    goalChance: 0.28,
  },
  {
    age: 37,
    label: 'first child',
    note: 'The first critical claims appear. They arrive without warning.',
    seconds: 10,
    gap: [1.28, 1.66],
    weights: { routine: 0.48, major: 0.4, critical: 0.12 },
    goalChance: 0.28,
  },
  {
    age: 42,
    label: 'home loan',
    note: 'A liability you cannot default on sits on top of everything.',
    seconds: 10,
    gap: [1.22, 1.58],
    weights: { routine: 0.4, major: 0.42, critical: 0.18 },
    goalChance: 0.26,
  },
  {
    age: 47,
    label: 'school fees and parents',
    note: 'The sandwich years. Two generations, one budget.',
    seconds: 10,
    gap: [1.16, 1.50],
    weights: { routine: 0.32, major: 0.42, critical: 0.26 },
    goalChance: 0.26,
  },
  {
    age: 53,
    label: 'college fund',
    note: 'Claims are big and close together. Cover has to already be up.',
    seconds: 10,
    gap: [1.10, 1.42],
    weights: { routine: 0.26, major: 0.42, critical: 0.32 },
    goalChance: 0.24,
  },
  {
    age: 60,
    label: 'retirement day',
    note: 'The last stretch. Hold the line to the vesting date.',
    seconds: 10,
    gap: [1.05, 1.36],
    weights: { routine: 0.22, major: 0.4, critical: 0.38 },
    goalChance: 0.24,
  },
];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure rules in src/cover.js, which is what scripts/balance.mjs
   runs headless — so every number below is exactly what the balance table in
   okf-brain/perfect-premium/log.md measured. */
export const GAME_CONFIG = {
  /** Hard session cap. A completed schedule ends the run well before this; the
      cap only exists so a stalled run can never outlive the 2-minute rule. */
  sessionSeconds: 120,

  /* -- The cover line ------------------------------------------------------
     The player's only verb: drag to set a TARGET cover, in [0,1] of the scale.
     The line then travels toward it at a rate limit, and the two rates are
     deliberately not equal.

     Dropping cover is nearly three times faster than raising it. That single
     asymmetry is the game's whole thesis: you can always stop paying for cover
     instantly, and you can never buy it in the moment you need it. It is why
     the fogged band on the horizon is worth reading, and why the reveal window
     is a chance to shave surplus rather than a chance to rescue a bad guess. */
  cover: {
    raisePerSecond: 0.52,
    dropPerSecond: 1.30,
    /** Cover carried into the first year. Zero: you start uninsured. */
    start: 0,
    /** Illustrative top of the scale, in ₹ lakh. Presentation only — the four
        gridlines then land on round 10/20/30/40 marks. */
    scaleLakh: 40,
  },

  /* -- The field -----------------------------------------------------------
     Space on screen is time until a claim lands. `horizonSeconds` is the right
     edge; `revealSeconds` is the vertical line where a claim's fogged band
     collapses to its true size.

     0.72 s of reveal buys 0.37 of raise at the rate above — enough to correct a
     routine or a major misread, not enough to rescue a critical one from the
     floor. The forecast band is therefore load-bearing rather than decorative. */
  field: {
    horizonSeconds: 3.6,
    revealSeconds: 0.72,
    /** Quiet run-up before the first claim of the run. */
    leadInSeconds: 2.8,
  },

  /* -- Budget: the price of carrying cover ---------------------------------
     Drains continuously in proportion to the cover currently carried, and is
     topped up once per chapter ("salary credited"). Hitting zero ends the run:
     the over-insurance failure, with a number on it.

     start 100 and burn 5.2 means a player pinned at full cover is losing
     5.2/s against an income of roughly 1.9/s and is bankrupt inside 30
     seconds. A player who carries what the horizon actually calls for averages
     nearer 0.35 and finishes with a surplus, which is worth points. */
  budget: {
    start: 110,
    max: 260,
    burnPerSecond: 10.5,
    /** Credited at the start of every chapter after the first. */
    incomePerYear: 17,
  },

  /* -- Security: the price of not carrying it ------------------------------
     A claim that lands above the cover line takes the uncovered part out of the
     family's security. The curve is deliberately super-linear:

       damage = cap x min(1, gap / fullGap) ^ exponent

     so a near-miss is a graze (a 5%-of-scale gap costs under 1) while a
     catastrophic claim taken bare costs the cap. That shape is the reason
     self-insuring the small stuff is a legitimate strategy and self-insuring
     the big stuff is not — which is the single most useful thing this game can
     teach, and it is a rule rather than a caption. */
  security: {
    start: 100,
    /** Damage at or beyond `damageFullGap`. */
    damageCap: 62,
    damageFullGap: 0.70,
    damageExponent: 1.6,
  },

  /* -- Goal tokens ---------------------------------------------------------
     Gold discs that ride LOW on the scale. Touching one with the cover line
     banks points and refunds budget: the money you were not spending on surplus
     cover, going to a goal instead. They are only reachable by dipping, and the
     climb back up is the slow direction — so a token taken in front of a
     critical claim is a trap, which is the point. */
  goal: {
    minY: 0.05,
    maxY: 0.2,
    /** Half-height of the collect window around the token. */
    tolerance: 0.075,
    budgetRefund: 5,
    score: 200,
  },

  /* -- Scoring -------------------------------------------------------------
     A covered claim pays a flat base plus an efficiency bonus that falls away
     as the surplus above the claim grows. Cover it by a hair and it is a
     PERFECT: double, and one step of combo. Cover it by a mile and it is worth
     the base only — and it cost you budget you will want later. */
  scoring: {
    coverBase: 20,
    efficiencyBonus: 30,
    /** Surplus at which the efficiency bonus reaches zero. */
    surplusSpan: 0.35,
    /** Surplus at or under which a cover counts as PERFECT. */
    perfectMargin: 0.06,
    perfectMultiplier: 2,
    comboMaxMultiplier: 3,
    /** End-of-run conversion of what you did not waste and did not lose. */
    budgetPerPoint: 10,
    securityPerPoint: 8,
  },

  /* -- Pacing --------------------------------------------------------------
     Beats between chapters and after the last claim of the run. */
  pacing: {
    yearGapSeconds: 1.6,
    /** Extra quiet after a chapter card before its first claim. */
    yearLeadSeconds: 0.9,
    tailSeconds: 1.6,
  },

  fx: {
    shortfallShake: 9,
    perfectHitStopSeconds: 0.06,
    coverParticles: 14,
    perfectParticles: 26,
    shortfallParticles: 20,
    goalParticles: 18,
    yearParticles: 16,
    winParticles: 40,
    bannerSeconds: 1.1,
    yearCardSeconds: 1.5,
  },

  hud: {
    /** Beat between the run ending on screen and the results screen appearing. */
    endBeatMs: 780,
    lowBudget: 28,
    lowSecurity: 34,
    /** Re-acquire countdown after an auto-pause releases, so backgrounding the
        tab cannot be used to freeze an inbound claim and study it. */
    resumeCountdownSeconds: 3,
  },
};

/** Total chapters in a run — derived, never typed twice. */
export const TOTAL_YEARS = YEARS.length;
