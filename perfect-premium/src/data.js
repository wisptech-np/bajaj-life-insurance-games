// data.js — Perfect Premium tunables.
//
// Every number a designer would want to retune lives here. src/stages.js (the
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

   Colour grammar for the timeline: GREEN is "premium paid on time" — the safe
   zone, the cleared milestones, the progress ring. GOLD is the reward tier —
   the PERFECT sliver at the centre of the safe zone and the bonus top-up band.
   ORANGE is the player's own hand: the sweeping marker and the stage now due.
   RED only ever means a grace period being burned. BLUE is the timeline itself,
   the years of the policy stretching from 25 to 60. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
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

/* ─── The life timeline ───────────────────────────────────
   Twelve premium due dates from the first policy year at 25 to the vesting date
   at 60. `age` drives the timeline ribbon; `label` is the life event the premium
   lands on top of, which is the whole point of the game — the money is always
   needed somewhere else, and you pay anyway.

   Order matters: index 3, 7 and 11 (every 4th stage, 1-based) are drawn on a
   bent arc instead of a straight bar. See isArcStage() in stages.js. */
export const STAGES = [
  { age: 25, label: 'first pay cheque', note: 'Policy year one. The habit starts here.' },
  { age: 28, label: 'first job raise', note: 'More money in hand. The premium still goes out first.' },
  { age: 30, label: 'wedding year', note: 'A new family to cover, not a reason to skip.' },
  { age: 32, label: 'first child', note: 'The cover just became somebody else’s future.' },
  { age: 35, label: 'home loan', note: 'An EMI is not an excuse. Pay both.' },
  { age: 38, label: 'car upgrade', note: 'Wants can wait a month. Cover cannot.' },
  { age: 41, label: 'school fees', note: 'Two bills, one due date. Both get paid.' },
  { age: 44, label: 'parents’ care', note: 'The sandwich year. Discipline carries it.' },
  { age: 47, label: 'college fund', note: 'The goal you insured for is close now.' },
  { age: 51, label: 'business dream', note: 'Risk on one side, cover on the other.' },
  { age: 55, label: 'pre-retirement top-up', note: 'Five years left. Do not blink.' },
  { age: 60, label: 'retirement day', note: 'The last premium. The first pension.' },
];

/* ─── Gameplay configuration ──────────────────────────────
   Consumed by the pure rules in src/stages.js, which is what
   scripts/balance.mjs runs headless — so every number below is exactly what the
   balance table in okf-brain/perfect-premium/log.md measured. */
export const GAME_CONFIG = {
  /** Hard session cap. The run also ends the moment grace runs out. */
  sessionSeconds: 100,
  /** Misses allowed. The third miss ends the run (spec: "3 grace periods"). */
  gracePeriods: 3,

  /* -- Sweep ---------------------------------------------------------------
     The marker position is a fraction of the bar in [0,1] and the speed is in
     bar-widths per second, so the kinematics are identical on every canvas
     size — a 360 px phone and a 430 px one play the same game.

     baseSpeed 0.90 means the first stage takes 1.11 s to cross the whole bar.
     The +7% per stage compounds to 1.07^11 = 2.10x by stage 12 (0.53 s per
     crossing), which is the difference between "comfortably readable" and
     "you have to commit". */
  sweep: {
    baseSpeed: 0.90,
    speedGrowthPerStage: 0.07,
    /** Marker starts here on stage 1, sweeping right. Reproducible. */
    startPosition: 0.0,
    startDirection: 1,
  },

  /* -- Zones ---------------------------------------------------------------
     Green narrows linearly from 24% of the bar to 9% across the twelve stages
     (the spec's ramp). The gold PERFECT sliver is a fixed fraction of whatever
     green currently is, so it narrows with it and a late perfect is genuinely
     harder than an early one.

     BALANCE — with the spec's sigma = 6% positional bot the per-stage clear
     probability is erf((green/2) / (sigma * sqrt2)), i.e. 95.4% on stage 1 down
     to 54.7% on stage 12; the chance of finishing all twelve inside three
     misses works out at ~38%, which is the middle of the 25-45% band the brief
     asks for. See scripts/balance.mjs for the measured numbers. */
  zone: {
    widthStart: 0.24,
    widthEnd: 0.09,
    /** PERFECT sliver width, as a fraction of the green zone's width. */
    perfectFraction: 0.26,
    /** Smallest the sliver may get, so stage 12 stays hittable at all. */
    perfectMinWidth: 0.014,
    /** Green's centre stays this far from either end of the bar, plus half its
        own width — otherwise a zone clipped by the bar's end would silently
        become easier (the marker cannot overshoot past 0 or 1). */
    edgeMargin: 0.05,
    /** A re-rolled zone must move at least this far, so a retry is a new read
        rather than the same muscle memory. */
    minRerollShift: 0.12,
  },

  /* -- Bonus top-up band ---------------------------------------------------
     A narrow gold band offset from green. Locking in it banks a flat bonus and
     does NOT advance the stage — you still owe the premium. Missing everything
     costs grace exactly like any other miss, which is what makes it a real
     decision instead of free money. */
  topUp: {
    /** No top-ups until the player has read two ordinary stages. */
    firstStageIndex: 2,
    chance: 0.35,
    width: 0.045,
    /** Clear air between the edge of green and the edge of the top-up band. */
    gap: 0.06,
    bonus: 150,
  },

  /* -- Scoring -------------------------------------------------------------
     stage 100 + remaining stage seconds x 10, doubled on a PERFECT, then
     multiplied by the combo (consecutive PERFECTs) up to x4. */
  scoring: {
    stageBase: 100,
    /** Speed-bonus allowance per stage attempt, seconds. */
    stageSeconds: 6,
    speedBonusPerSecond: 10,
    perfectMultiplier: 2,
    comboMaxMultiplier: 4,
  },

  /* -- Pacing --------------------------------------------------------------
     The session clock runs through all of these; they are what stops a
     twelve-stage run being over in eleven seconds. */
  timing: {
    /** Beat between a lock resolving and the next sweep going live. */
    resolveSeconds: 0.55,
    /** Extra beat when the lock cost a grace period (the shake needs room). */
    missResolveSeconds: 0.85,
    /** Shorter beat for a banked top-up — the stage has not moved on. */
    topUpResolveSeconds: 0.45,
  },

  fx: {
    missShake: 8,
    perfectHitStopSeconds: 0.07,
    lockParticles: 14,
    perfectParticles: 26,
    missParticles: 18,
    topUpParticles: 20,
    stageClearParticles: 16,
    winParticles: 40,
    bannerSeconds: 1.15,
    markerSquashSeconds: 0.26,
    nodePopSeconds: 0.5,
  },

  hud: {
    /** Beat between the run ending on screen and the results screen appearing. */
    endBeatMs: 720,
    lowTimeSeconds: 15,
  },
};

/** Total stages in a run — derived, never typed twice. */
export const TOTAL_STAGES = STAGES.length;
