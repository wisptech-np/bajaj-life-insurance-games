// data.js — Smart Recall tunables.
//
// Every number a designer would want to retune lives here. The game component
// reads from this file and never hard-codes gameplay values; the only constants
// left in the component are drawing details (stroke widths, glyph geometry).
//
// Feel constants shared across every game in the repo (fixed step, input buffer,
// particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.
//
// This file is imported by scripts/balance.mjs under node, so it must stay free
// of DOM and React references.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar: every goal tile owns one hue and one silhouette, and nothing
   else on screen uses that hue. RED (#EF4444) is reserved for exactly one thing
   — the risk flash and the slip — so red never means "a goal", it always means
   "do not touch this". White is the plan itself (the playback glow). */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26922',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',
  dangerDeep: '#7F1D1D',

  bgDark: '#0B1221',
  boardTop: '#0A1E42',
  boardMid: '#0B2450',
  boardLow: '#061229',

  tileWell: 'rgba(255,255,255,0.05)',
  tileEdge: 'rgba(255,255,255,0.14)',
  tileShade: 'rgba(4,12,26,0.55)',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── The nine goals ──────────────────────────────────────
   Grid order is reading order (row 0 left→right, then row 1, then row 2), and
   `pitch` climbs monotonically with it. That is deliberate: the pitch index is
   fed to the kit's `combo(depth)` voice (440 Hz x 1.122^depth — a whole-tone
   ladder), so a played sequence is a little melody whose contour maps onto the
   shape it draws across the grid. Two different memories of the same plan
   (where it moved, how it sounded) is what makes a 9-step sequence learnable.

   `icon` selects a programmatic vector silhouette in SmartRecallGame.jsx. No
   emoji, no image files — the silhouettes are the primary identifier and the
   hues are the secondary one, which is the way round it has to be with nine
   categories on one screen. */
export const GOALS = [
  { id: 'health', label: 'Health', icon: 'heart', color: '#FF4D6D', colorLt: '#FFB3C0', colorDeep: '#7E1B2E', pitch: 0 },
  { id: 'home', label: 'Home', icon: 'house', color: '#2E7BE8', colorLt: '#A9CBFF', colorDeep: '#123A75', pitch: 1 },
  { id: 'education', label: 'Education', icon: 'cap', color: '#8B5CF6', colorLt: '#CDB7FF', colorDeep: '#3D2378', pitch: 2 },
  { id: 'retirement', label: 'Retirement', icon: 'sun', color: '#E3B23C', colorLt: '#FFE0A0', colorDeep: '#6E4E0F', pitch: 3 },
  { id: 'travel', label: 'Travel', icon: 'plane', color: '#17C3D4', colorLt: '#A2ECF4', colorDeep: '#0A5A64', pitch: 4 },
  { id: 'family', label: 'Family', icon: 'family', color: '#2FB162', colorLt: '#A2E9BD', colorDeep: '#0F5029', pitch: 5 },
  { id: 'savings', label: 'Savings', icon: 'coins', color: '#B7DD3F', colorLt: '#E4F5A8', colorDeep: '#4F681A', pitch: 6 },
  { id: 'wedding', label: 'Wedding', icon: 'rings', color: '#EC5FA8', colorLt: '#FFBBDD', colorDeep: '#71184A', pitch: 7 },
  { id: 'emergency', label: 'Emergency', icon: 'shieldbolt', color: '#F26922', colorLt: '#FFC3A0', colorDeep: '#7A2C08', pitch: 8 },
];

export const TILE_COUNT = GOALS.length;

/* ─── Gameplay configuration ──────────────────────────────
   `rounds`, `playback`, `timing`, `scoring` and `bot` are all consumed by
   src/sequence.js and by scripts/balance.mjs, so every documented number below
   is exactly what the balance gate measured. */
export const GAME_CONFIG = {
  /** Hard session cap. The brief's 110 s clock. */
  sessionSeconds: 110,

  /**
   * GAME_STANDARD §3's hard 2-minute cap, in WALL time.
   *
   * This is a different quantity from `sessionSeconds` and the difference is
   * load-bearing. The session clock is held during the beats the player cannot
   * influence (see `timing` below), so a run's wall duration is the clock plus
   * that held time. The gate asserts `sessionSeconds + heldSeconds <=
   * wallCapSeconds`, which is what actually caps how much chrome the game can
   * afford to hold the clock through.
   */
  wallCapSeconds: 120,

  /** Slips allowed. The 3rd slip loses the run. */
  maxSlips: 3,

  /** Seconds of no input during recall before the step is scored as a slip. */
  idleSeconds: 5,

  /* -- The seven rounds ------------------------------------------------------
     `len`   sequence length, the brief's 3..9 ramp.
     `risk`  how many steps in the sequence flash RED and must be SKIPPED during
             recall. The brief specifies one from round 4; the balance gate
             measured that as unwinnable-adjacent (26 % against a 25-45 % band,
             1 pp of margin) and the ramp below is the sim-proven correction —
             see okf-brain/smart-recall/log.md. Every other brief constant
             (7 rounds, lengths 3..9, 3 slips, 110 s, 460→300 ms) is literal.
     `minDistinct` floor on how many different tiles a round's sequence uses,
             counting the risk tiles. The brief requires >= 5 by round 4. */
  rounds: [
    { len: 3, risk: 0, minDistinct: 2 },
    { len: 4, risk: 0, minDistinct: 3 },
    { len: 5, risk: 0, minDistinct: 4 },
    { len: 6, risk: 1, minDistinct: 5 },
    { len: 7, risk: 2, minDistinct: 5 },
    { len: 8, risk: 2, minDistinct: 5 },
    { len: 9, risk: 2, minDistinct: 5 },
  ],

  /** Generator rule: never more than this many of one tile back to back. */
  maxImmediateRepeat: 2,

  /* -- Playback --------------------------------------------------------------
     One step = `litFraction` of the period glowing, the rest dark. The period
     falls linearly from startMs on round 1 to endMs on the last round. */
  playback: {
    startMs: 460,
    endMs: 300,
    litFraction: 0.62,
    /**
     * Floor on the DARK gap between two steps, in ms.
     *
     * At a flat 62% duty the gap shrinks with the period — 460 ms gives 175 ms
     * of dark, but 300 ms gives only 114 ms, which is barely over the ~100 ms
     * at which two flashes of the same tile stop reading as two events. That
     * lands exactly on round 7, where sequences are longest and a merged repeat
     * is most expensive. The lit time is therefore
     * `min(period x litFraction, period - minDarkGapMs)`, which shortens the
     * glow rather than the period — so playback duration, and every number in
     * sessionBudget(), is unchanged.
     */
    minDarkGapMs: 140,
  },

  /* -- Timing ----------------------------------------------------------------
     Which beats the session clock RUNS through is a balance decision, not a
     presentation one, so it lives here and scripts/balance.mjs bills the bots
     with exactly these numbers.

     The clock ticks through `playback`, `recall` and `correction` — the game
     presenting the plan, the player answering it, and the consequence of the
     player's own slip. It is HELD through `intro`, `banner`, `lead` and
     `clear`, which are chrome the player cannot influence or speed up.

     Why: the un-skippable beats used to tick, which compressed the per-tap
     budget to 2.20 s and put a silent step function right on top of plausible
     careful-human pace — a never-wrong player at 2.5 s/tap lost 100% of the
     time, never tripping the 5 s idle ring. Holding the clock through the
     chrome moves that edge to 2.66 s/tap.

     The remaining cliff is geometric, not a tuning choice. Wall time is bounded
     by wallCapSeconds (120 s) and playback alone costs 15.21 s of it, so the
     highest edge ANY configuration of this game could have is
     (120 - 15.21) / 35 taps = 2.99 s/tap. 2.66 is 89% of that ceiling. The rest
     is handled by signalling rather than by budget — see `hud.paceWarn`. */
  timing: {
    /** One-off "watch the plan" beat before round 1. Clock held. */
    introSeconds: 0.6,
    /** ROUND N card at the top of every round. Clock held. */
    bannerSeconds: 0.75,
    /** Silence between the banner and the first light. Clock held. */
    leadInSeconds: 0.2,
    /** After a slip: the correct tile is shown, then recall resumes. Clock ticks. */
    correctionSeconds: 0.6,
    /** Round-cleared celebration before the next banner. Clock held. */
    roundClearSeconds: 0.35,
    /** Beat between the run ending on screen and the results screen. */
    endBeatMs: 700,
    /**
     * Budget pace for the worst-case session proof: a deliberate, unhurried
     * tap. The gate asserts the whole 7-round run fits inside sessionSeconds at
     * this pace with playback and all three slip beats billed.
     */
    tapBudgetSeconds: 0.7,
    /**
     * Floor the proof must clear for the *average* tap interval a player can
     * afford and still finish. Comfortably past the 2.2-2.5 s/tap band a
     * careful non-gamer recalling 8-9 steps actually produces.
     */
    minAffordableTapSeconds: 2.5,
  },

  scoring: {
    /** Per correctly recalled step, multiplied by the round number. */
    perStep: 25,
    /** Flat award for finishing a round's recall. */
    roundClear: 150,
    /** Extra when the round was recalled with zero slips. */
    noSlipRound: 100,
  },

  /* -- Bot model (balance gate only) ----------------------------------------
     Not read by the game. scripts/balance.mjs models a player who recalls each
     required tap with an error probability that grows with how long the plan
     is: p = errorPerLength x len. `tapMean/Sigma/Min` is the thumb cadence the
     sim bills the session clock with. */
  bot: {
    errorPerLength: 0.015,
    sharpErrorPerLength: 0.002,
    tapMeanSeconds: 0.62,
    tapSigmaSeconds: 0.16,
    tapMinSeconds: 0.22,
    /**
     * The "careful" archetype: an accurate but unhurried player — the
     * non-gamer on an insurance microsite who gets the order right and takes
     * their time about it. Its ONLY failure mode should be slips, never the
     * clock, which is exactly what the gate asserts. Without it the gate had no
     * coverage of slow-accurate play at all: every other bot averages 0.62 s.
     */
    carefulTapMeanSeconds: 2.2,
    carefulTapSigmaSeconds: 0.45,
    carefulTapMinSeconds: 0.9,
    /** A slower probe, reported rather than gated, to show where the edge is. */
    deliberateTapMeanSeconds: 2.6,
  },

  hud: {
    lowTimeSeconds: 20,
    /* -- Pace warning ---------------------------------------------------
       A generic low-time pulse is no use to a slow player: by 20 s left their
       deficit is unrecoverable, and the 5 s idle ring never fires for someone
       taking 3 s a step. This cue instead projects the player's OWN measured
       pace over the taps and playbacks still to come, and warns on the
       headroom that leaves.

       A threshold on the affordable *rate* was tried first and measured at
       2.3 s of warning before a clock loss — a player 0.06 s/tap over budget
       hugs the line until the denominator is small enough to be noise.
       Projection gives the same player a warning from their third tap. */
    /** Taps needed before the projection means anything. */
    paceMinSamples: 3,
    /** Seconds of projected spare clock below which the amber chip shows. */
    paceWarnHeadroomSeconds: 12,
    /** ...and below which it goes red. */
    paceCriticalHeadroomSeconds: 4,
  },

  fx: {
    /** Pop burst when a tap lands on the right tile. */
    correctParticles: 14,
    /** Burst from the tile that lit during playback. */
    playbackParticles: 9,
    /** Burst on a slip. */
    slipParticles: 18,
    slipShake: 7,
    slipHitStopSeconds: 0.05,
    /** Wrong-tile shake: amplitude in px and how long it runs. */
    tileShakePx: 7,
    tileShakeSeconds: 0.42,
    roundClearParticles: 26,
    winParticles: 40,
    loseParticles: 24,
    /** Seconds a tapped tile stays squashed / glowing after the press. */
    pressSeconds: 0.34,
    litFlashSeconds: 0.3,
    riskParticles: 12,
    /** Fraction of the idle window that passes before the ring appears. */
    idleRingDelayFraction: 0.24,
  },
};

/**
 * Best possible score, used by the Results ring as "a full circle".
 * Every step of every round correct, every round cleared, no slips. Derived
 * from the round table so it cannot drift from it.
 */
export function perfectScore(cfg = GAME_CONFIG) {
  const s = cfg.scoring;
  let total = 0;
  for (let i = 0; i < cfg.rounds.length; i++) {
    const round = i + 1;
    const taps = cfg.rounds[i].len - cfg.rounds[i].risk;
    total += taps * s.perStep * round + s.roundClear + s.noSlipRound;
  }
  return total;
}
