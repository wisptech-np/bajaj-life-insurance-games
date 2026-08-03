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
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745.

   Colour grammar: every goal tile owns one hue and one silhouette, and nothing
   else on screen uses that hue. RED is reserved for exactly one thing — the risk
   flash and the slip — so red never means "a goal", it always means "do not
   touch this". White is the plan itself (the playback glow).

   2026-08-03 repaint. The review read the board as dull, and it was: a resting
   tile was its hue held back to ~15% over deep navy, so nine goals composited
   down to nine near-identical mud rectangles and the whole stage sat in one
   narrow, low-chroma band. The fix is structural rather than a nudge —

     · every goal now carries a fourth token, `colorRest`, an OPAQUE mid-tone of
       its own hue. Alpha-blending a hue over navy is what desaturates it; an
       opaque rest tone cannot desaturate. Resting tiles are now unmistakably
       nine different colours.
     · `color` / `colorLt` are pushed up in chroma so the LIT state is a real
       jump in both luminance and saturation off that brighter rest, not a
       marginal one.
     · the stage is pushed the other way — deeper at the bottom, a stronger
       brand-blue wash at the top — so cards gain contrast against it rather
       than losing it to a brightened background.
     · tile labels used to be 52% white straight onto the hue, which failed AA
       on the light goals. They are now near-solid white on a `tileScrim` plate,
       which fixes every hue at once instead of hand-tuning nine.

   Contrast floors this palette is held to (verified, see okf-brain log):
   body text >= 4.5:1, icons and state indicators >= 3:1. Colour is never the
   only signal — correct draws a tick, a slip draws a cross, risk draws a
   circle-slash, and the progress rail marks slips with an X glyph. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#3D8BFF',
  orange: '#F26522',
  orangeLt: '#FF9A52',
  green: '#28A745',
  greenLt: '#5BF08D',
  gold: '#FFC845',
  goldLt: '#FFE9A0',
  danger: '#FF3B30',
  dangerLt: '#FFA3A3',

  bgDark: '#081026',

  /* Stage. Top carries the brand blue, bottom drops away, so the board reads as
     a lit plate on a deep field instead of a flat navy rectangle. */
  boardTop: '#123A7D',
  boardMid: '#0B2A5C',
  boardLow: '#050F28',
  boardWell: 'rgba(64,150,255,0.38)',
  /* The plate is DARKER than the field it sits in, not lighter. A lighter plate
     was competing with the tiles for the eye and squeezing tile-vs-ground
     contrast; recessing it lets nine saturated keys read as raised objects. */
  platePaint: 'rgba(3,10,26,0.42)',
  plateEdge: 'rgba(120,190,255,0.34)',

  /* Tile chrome. `tileScrim` is the plate the label sits on — it is what makes
     one label colour legible on all nine hues. */
  tileRim: 'rgba(255,255,255,0.34)',
  tileRimLit: 'rgba(255,255,255,0.92)',
  tileScrim: 'rgba(4,10,22,0.78)',
  labelInk: 'rgba(255,255,255,0.95)',

  /* HUD glass. Both were roughly half these values and read as absent. */
  glass: 'rgba(255,255,255,0.09)',
  glassLine: 'rgba(255,255,255,0.26)',
  inkDim: 'rgba(255,255,255,0.78)',
  /* Unfilled step on the progress rail. Was 0.22 — invisible on a lit board. */
  stepPending: 'rgba(255,255,255,0.40)',
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
   categories on one screen.

   Four colour tokens per goal, and the split matters:
     colorRest  OPAQUE resting face. The tile's identity when nothing is
                happening. Mid-tone and fully saturated, because this is the one
                that used to be an alpha wash and hence the one that was dull.
     color      the lit body — full chroma, ~2x the luminance of colorRest.
     colorLt    lit top stop, and the resting icon fill (>= 3:1 on colorRest).
     colorDeep  bottom stop of both gradients; the shadow side of the key.
   Home keeps a brightened Bajaj blue and Emergency a brightened Bajaj orange,
   so the two brand anchors are still the two loudest tiles on the board. */
export const GOALS = [
  { id: 'health', label: 'Health', icon: 'heart', color: '#FF3D71', colorLt: '#FFB3C8', colorRest: '#A32149', colorDeep: '#6B1230', pitch: 0 },
  { id: 'home', label: 'Home', icon: 'house', color: '#2B8CFF', colorLt: '#B3D8FF', colorRest: '#1552A8', colorDeep: '#0A2E6B', pitch: 1 },
  { id: 'education', label: 'Education', icon: 'cap', color: '#A06BFF', colorLt: '#DCC8FF', colorRest: '#5427BE', colorDeep: '#33167A', pitch: 2 },
  { id: 'retirement', label: 'Retirement', icon: 'sun', color: '#FFC531', colorLt: '#FFE9A6', colorRest: '#A06A00', colorDeep: '#5A3C00', pitch: 3 },
  { id: 'travel', label: 'Travel', icon: 'plane', color: '#14D3E8', colorLt: '#ADF2F9', colorRest: '#067C8D', colorDeep: '#034C58', pitch: 4 },
  { id: 'family', label: 'Family', icon: 'family', color: '#24CC6F', colorLt: '#A6F3C6', colorRest: '#0D7C3F', colorDeep: '#064E27', pitch: 5 },
  { id: 'savings', label: 'Savings', icon: 'coins', color: '#C4F03A', colorLt: '#EAFBAA', colorRest: '#6E9414', colorDeep: '#3D5406', pitch: 6 },
  { id: 'wedding', label: 'Wedding', icon: 'rings', color: '#FF5FB4', colorLt: '#FFBFE0', colorRest: '#A81C72', colorDeep: '#6C1049', pitch: 7 },
  { id: 'emergency', label: 'Emergency', icon: 'shieldbolt', color: '#FF7A2F', colorLt: '#FFC9A3', colorRest: '#B2430C', colorDeep: '#732A05', pitch: 8 },
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
    /** Seconds the confirmed-correct tick and its green wash stay on the tile. */
    okSeconds: 0.5,
    /** Seconds the green board-plate ring holds after a round is cleared. */
    clearFlashSeconds: 0.7,
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
