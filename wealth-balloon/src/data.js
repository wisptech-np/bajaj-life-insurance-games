// data.js — Wealth Balloon tunables.
//
// Every number a designer would want to retune lives here. goals.js (the pure
// model) and WealthBalloonGame.jsx (the canvas component) read from this file
// and never hard-code gameplay values; the only constants in the component are
// drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js.
//
// scripts/balance.mjs imports THIS file and src/goals.js — the modules that
// ship — so every measured number quoted below is measured against the game the
// player actually gets.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar. BLUE is cover and everything protective. GOLD is money —
   income, funded goals, banked score. GREEN means "this goal is going to make
   it". ORANGE is urgency, never damage: a deadline closing in. RED is damage
   only: a forecast shock and the money it takes. Nothing changes colour for
   decoration; every colour change is information. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
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

/* Balloon fill ramp, indexed by how a goal is tracking against its deadline.
   `short` = cannot be finished in the time left; `ok` = reachable; `done` = at
   or past target. The ramp IS information — it tells you at a glance which of
   the three is still worth your income. */
export const SKIN = {
  short: { core: [255, 190, 190], mid: [239, 68, 68], deep: [120, 12, 12] },
  ok: { core: [122, 186, 255], mid: [30, 107, 224], deep: [0, 45, 122] },
  done: { core: [214, 255, 214], mid: [40, 167, 69], deep: [12, 78, 32] },
};

/* ─── Gameplay configuration ────────────────────────────── */
export const GAME_CONFIG = {
  /** Hard session cap. One sitting, one thumb. */
  sessionSeconds: 90,

  /** Goals in play at once. Three is the smallest number that forces a choice. */
  slots: 3,

  /* -- Income -------------------------------------------------------------
     The single scarce resource. It refills at `ratePerSecond` and drains at
     `fillPerSecond` while you hold a balloon, and the drain is ~3x the refill,
     so holding is a commitment of the next few seconds of income rather than a
     free action. The cap stops a player banking a huge reserve by doing nothing
     early — income you do not deploy is income you lose, which is also true of
     the thing being modelled.

     Budget: 80 + 24 x 90 = 2240 over a full session. About 11.7 goals actually
     fall due in that time (measured — the `idle` bot's miss count), averaging
     ~204, so the goals on the table are worth ~2390. The budget is 94% of that:
     funding everything is arithmetically almost possible and practically never
     is, because you cannot be on three balloons at once, shocks take money off
     the ones you are not watching, and every premium is income not funding
     anything. That gap is the game. The skilled bot funds 7.6 of the 11.7. */
  income: { start: 80, ratePerSecond: 24, cap: 170, fillPerSecond: 76 },

  /* -- Goals --------------------------------------------------------------
     A goal shows its target as a dashed ring on the balloon and its deadline as
     a bar underneath. Both are visible from the moment it spawns: there is no
     hidden threshold anywhere in this game. Targets grow with each spawn so the
     last third of a session is genuinely harder than the first.

     `staggerSeconds` offsets the three opening deadlines. Without it all three
     goals fall due at once and the opening 20 seconds contain no decision. */
  goal: {
    baseTarget: 140,
    targetStep: 12,
    targetJitter: 0.16,
    windowSeconds: 19.5,
    windowJitter: 0.1,
    staggerSeconds: 5.5,
    names: [
      "CHILD'S FEES",
      'HOME FUND',
      'RETIREMENT',
      'EMERGENCY',
      'WEDDING',
      'CAR',
      'EDUCATION',
      'HEALTH FUND',
    ],
  },

  /* -- Cover --------------------------------------------------------------
     FIXED premium, FIXED term, absorbs one shock in full and is then spent.

     Fixed price is the entire teaching device. The premium never moves; the
     money at risk moves constantly, because it is a percentage of whatever that
     goal is holding right now. So every shock asks the same question with both
     numbers already printed on screen — loss vs premium — and the answer
     genuinely changes. Cover a balloon holding 180 against a 55% shock and you
     save 99 for 28. Cover a balloon holding 30 against the same shock and you
     spend 28 to save 16.

     `edge` is the margin the coach overlay and the balance bots require before
     calling cover worthwhile; it is not applied to the player, who can buy
     whenever they like.

     `termSeconds` > the forecast lead time, so buying the moment you see a
     shock always covers it. Buying earlier than that risks the term lapsing
     unused — which is why blanket-covering everything loses. */
  cover: { premium: 28, termSeconds: 10, edge: 1.0 },

  /* -- Shocks -------------------------------------------------------------
     Forecast `leadSeconds` before they land, on a named goal, with the severity
     shown as a percentage AND as the rupee figure it works out to at that
     goal's present value. Severity is drawn uniform; nothing else about a shock
     is random and nothing about it is hidden.

     Severity is a fraction of the goal's CURRENT value, not a flat amount. That
     is what ties the size of the decision to the size of the position, and it
     is why the right answer is not always the same answer.

     The gap between shocks shortens through the session (`gapRampPerSecond`),
     which is the difficulty ramp. */
  risk: {
    firstAtSeconds: 7,
    gapSeconds: 6.5,
    minGapSeconds: 4.0,
    gapRampPerSecond: 0.022,
    leadSeconds: 4.0,
    minSeverity: 0.28,
    maxSeverity: 0.72,
  },

  /* -- Scoring ------------------------------------------------------------
     Funding a goal scores its target. Missing one costs `missPenalty` and can
     never take the score below zero.

     BALANCE (measured — `node scripts/balance.mjs`, which imports src/goals.js
     and this file rather than re-implementing anything). 4000 runs, seed
     0xba110032. See okf-brain/wealth-balloon/log.md for the full table and the
     reasoning behind the win line.

     The gate this game exists to pass is the bottom three rows: a bot that
     cannot read the screen must not score like a bot that can. */
  scoring: { targetScore: 1000, missPenalty: 40 },

  fx: {
    hitShake: 9,
    hitStopSeconds: 0.06,
    fundParticles: 22,
    absorbParticles: 20,
    hitParticles: 24,
    missParticles: 10,
    winParticles: 40,
  },

  hud: {
    /** Beat between the run ending on screen and the results screen appearing. */
    endBeatMs: 900,
    lowTimeSeconds: 15,
    /** Seconds the clock is held after returning from a background pause. */
    resumeCountdown: 3,
  },
};

/** Score the Results ring treats as a full circle: the win line itself. */
export const RESULT_TARGET_SCORE = GAME_CONFIG.scoring.targetScore;
