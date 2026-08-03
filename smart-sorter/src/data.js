// data.js — Smart Sorter tunables.
//
// Every number a designer would want to retune lives here. rules.js and
// SmartSorterGame.jsx read from this file and never hard-code gameplay values;
// the only constants in the component are drawing details (stroke widths, glyph
// geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar maps one brand colour to one swipe direction, and never reuses
   it for anything else:

     BLUE   = Protect  = swipe LEFT   (the shield shelf)
     GREEN  = Grow     = swipe RIGHT  (the growth shelf)
     ORANGE = Bin      = swipe DOWN   (the discard chute)

   RED is reserved exclusively for mistakes — a missort flash, a scroll-past, the
   mistake pips. Nothing a player is *supposed* to touch is ever red, so red on
   screen always means "that one cost you". GOLD is reserved for urgent items. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  orangeGlow: 'rgba(242,101,34,0.55)',
  green: '#28A745',
  greenLt: '#4ADE80',
  greenGlow: 'rgba(40,167,69,0.55)',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  beltTop: '#0A1E42',
  beltMid: '#0B2450',
  beltLow: '#061229',
  beltTread: 'rgba(255,255,255,0.055)',
  railFace: 'rgba(255,255,255,0.05)',
  railLine: 'rgba(255,255,255,0.12)',

  cardFace: '#12213F',
  cardFaceLt: '#1B3059',
  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/** Per-family presentation. `swipe` is the gesture that files the item. */
export const FAMILY_STYLE = {
  protect: {
    swipe: 'left',
    title: 'Protect',
    color: COLORS.brandBlue,
    colorLt: COLORS.brandBlueLt,
    glow: COLORS.brandBlueGlow,
    accent: '#7FB6FF',
  },
  grow: {
    swipe: 'right',
    title: 'Grow',
    color: COLORS.green,
    colorLt: COLORS.greenLt,
    glow: COLORS.greenGlow,
    accent: '#A7F3C4',
  },
  bin: {
    swipe: 'down',
    title: 'Bin',
    color: COLORS.orange,
    colorLt: COLORS.orangeLt,
    glow: COLORS.orangeGlow,
    accent: '#FFC7A3',
  },
};

/* ─── Gameplay configuration ──────────────────────────────
   `track`, `belt`, `scoring` and `mistakes` are consumed by the pure rules in
   rules.js — the same rules scripts/balance.mjs runs headless, so every number
   below is exactly what the balance table measured. */
export const GAME_CONFIG = {
  sessionSeconds: 90,

  /* -- The conveyor, in normalised track units ----------------------------
     An item enters at t = 0 and is gone at t = missAt. The component maps t to
     pixels (t = 0 is one card-height above the belt, t = missAt is the mouth of
     the bin strip), so the geometry below is resolution-independent: the same
     numbers describe the same game on a 320 px handset and a 430 px one.

     headTop = 0.70 puts the sorting head in the bottom third of the belt, which
     is what the brief asks for, and leaves the whole upper 70% as read-ahead
     time. The reaction window is (missAt - headTop) / speed:

       item     belt speed   window    urgent window
       1        0.160        1.88 s    1.25 s
       25       0.226        1.33 s    0.88 s
       55       0.303        0.99 s    0.66 s

     Even the last urgent card is 2.6x the 250 ms reaction the balance bot uses,
     so a run is never lost to a window a human could not physically hit — the
     difficulty is in reading twelve item types under time pressure, not in
     twitch speed. */
  track: {
    headTop: 0.70,
    // An item that reaches this has scrolled past the head: one mistake.
    missAt: 1.0,
    // Gap (track units) the newest item must have travelled before the next one
    // enters. 0.34 > the 0.30-deep head zone, so ordinary items arrive one at a
    // time and the swipe target is never ambiguous.
    spacing: 0.34,
    // Urgent items ride at 1.5x belt speed, so they close on whatever is ahead
    // of them. Launching them from further back keeps the worst-case gap at
    // 0.287 track units (~165 px on a 560 px-tall belt) — they crowd the head
    // for a beat of real pressure, but two cards never overlap. The balance sim
    // asserts this across every seeded run.
    urgentSpacing: 0.52,
  },

  /* -- Belt speed ---------------------------------------------------------
     One global belt speed drives every ordinary item, so the gaps the spawner
     lays down are preserved for the whole run — a ramp that only applied to
     newly spawned items would let a fast card walk into a slow one.

     +6% every 5 items compounds to 1.90x by item 55, which is where a 90 s run
     lands. See scripts/balance.mjs. */
  belt: {
    baseSpeed: 0.16,
    rampEvery: 5,
    rampFactor: 1.06,
    urgentSpeedFactor: 1.5,
  },

  /** Every Nth item (1-indexed) glows gold, pays double and rides 1.5x faster. */
  urgentEvery: 10,

  /* -- Scoring ------------------------------------------------------------
     Correct sort 40 x multiplier, urgent 80 x multiplier. The multiplier is the
     combo meter: it steps up one notch every `comboStep` consecutive correct
     sorts and caps at x5, and any mistake drops it straight back to x1.

     BALANCE (measured — `node scripts/balance.mjs`, 500 seeded runs per policy):
     the 1200 target is a floor rather than the binding gate. A run that survives
     90 s has necessarily sorted ~53 items, which clears 1200 several times over,
     so in practice the win is decided by the mistake budget. The target is kept
     at the brief's value because it still does real work: it makes "survive" and
     "score" a single sentence on the results screen, and it is the number the
     progress bar fills toward. See okf-brain/smart-sorter/log.md. */
  scoring: {
    correct: 40,
    urgent: 80,
    comboStep: 3,
    maxMultiplier: 5,
    targetScore: 1200,
  },

  /* -- Mistake budget -----------------------------------------------------
     Missort or scroll-past = 1 mistake; this many ends the run.

     Three lives is the right endgame pressure and is left alone — raising it to
     five sent the casual bot's win rate from the brief's 25-45% band to 83%.
     The defect was never the budget, it was WHEN the budget got spent: a
     first-time player meets twelve unfamiliar item types at 1.9 s per card,
     misreads the opening two or three, and the run is over inside fifteen
     seconds without a single card having resolved on screen. That is what "the
     game is not working" was describing.

     So the first `graceItems` cards cannot cost a life. They still flash red
     and still break the combo, so they teach; they just do not end the run
     before the player has seen the game work once. */
  mistakes: { allowed: 3, graceItems: 3 },

  /* -- Layout -------------------------------------------------------------
     Fractions of the measured canvas, with pixel clamps so the belt stays
     legible on a short screen and does not become cartoonish on a tall one. */
  layout: {
    railWFrac: 0.17,
    railWPx: [58, 84],
    binHFrac: 0.095,
    binHPx: [46, 70],
    cardHFrac: 0.15,
    cardHPx: [62, 94],
    cardWFrac: 0.82,
    gapPx: 6,
    // Tread stripes scrolling down the belt, spacing in px.
    treadSpacingPx: 34,
  },

  fx: {
    sortParticles: 18,
    urgentParticles: 26,
    mistakeParticles: 20,
    spawnParticles: 8,
    winParticles: 40,
    loseParticles: 26,
    mistakeShake: 8,
    missShake: 6,
    hitStopSeconds: 0.06,
    // Seconds a shelf stays lit after an item files into it.
    shelfFlashSeconds: 0.45,
    shelfPopSeconds: 0.4,
    // How long a filed card flies before it fades out.
    flySeconds: 0.5,
    bannerSeconds: 1.2,
    cardEnterSeconds: 0.26,
  },

  hud: {
    endBeatMs: 650,
    lowTimeSeconds: 15,
  },
};

/** Score the Results ring treats as a full circle: the win line itself. */
export const RESULT_TARGET_SCORE = GAME_CONFIG.scoring.targetScore;
