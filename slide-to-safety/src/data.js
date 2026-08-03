// data.js — Slide to Safety tunables.
//
// Every number a designer would want to retune lives here. The game component
// reads from this file and never hard-codes gameplay values; the only constants
// in the component are drawing details (stroke widths, glyph geometry).
//
// Physics/feel constants shared across every game in the repo (fixed step, input
// buffer, particle budgets, haptics) come from the kit: src/kit/config.js BALANCE.
//
// This file is imported by scripts/balance.mjs under node, so it must stay free
// of DOM/React references.

/* ─── Palette ─────────────────────────────────────────────
   Brand: BLUE #003DA6, ORANGE #F26522, GREEN #28A745, dark bg #0B1221.

   Colour grammar for the frozen lake: the board is pale ice on deep water, so
   anything saturated is information. BLUE is the player (the shield token, the
   cover glow) — protection is the thing you move. GREEN is the family tile, the
   only safe destination. GOLD is wealth (premium coins). RED/rust is thin ice —
   the only thing on the board that can end a run. ORANGE is the player's own
   hand: the swipe hint arrows and the move counter. Grey-slate is inert rock. */
export const COLORS = {
  brandBlue: '#003DA6',
  brandBlueLt: '#1E6BE0',
  brandBlueGlow: 'rgba(30,107,224,0.55)',
  orange: '#F26522',
  orangeLt: '#FF8A3D',
  green: '#28A745',
  greenLt: '#4ADE80',
  gold: '#FFC845',
  goldLt: '#FFE38A',
  goldDeep: '#B07B12',
  danger: '#EF4444',
  dangerLt: '#FF8B8B',

  bgDark: '#0B1221',
  waterTop: '#0A1E42',
  waterMid: '#0B2450',
  waterLow: '#061229',

  // Ice
  ice: '#CFE4F7',
  iceLt: '#F2F9FF',
  iceDeep: '#9BC1E4',
  iceLine: 'rgba(255,255,255,0.5)',
  iceEdge: 'rgba(11,18,33,0.28)',

  // Rock
  rock: '#3C516C',
  rockLt: '#6A83A2',
  rockDeep: '#1C2A3D',

  // Thin ice
  crackIce: '#B9CFE2',
  crackLine: 'rgba(16,38,66,0.72)',
  crackWarn: '#E0785A',
  hole: '#04101F',

  // Wind
  wind: 'rgba(166,208,255,0.55)',
  windCore: 'rgba(255,255,255,0.85)',

  // Cover point (the safe zone). Ice-blue so it never competes with the green
  // family tile — one is the destination, the other is shelter on the way.
  cover: '#8FC2FF',
  coverLt: '#CFE9FF',
  coverDeep: '#1E5FBF',

  ink: '#FFFFFF',
  inkDim: 'rgba(255,255,255,0.62)',
  glass: 'rgba(255,255,255,0.05)',
  glassLine: 'rgba(255,255,255,0.12)',
};

/* ─── Gameplay configuration ──────────────────────────────
   `scoring`, `timing` and `retries` are consumed by src/slide.js and by
   scripts/balance.mjs, so every documented number below is exactly what the
   balance gate measured. */
export const GAME_CONFIG = {
  /** Hard session cap. The brief's 120 s clock. */
  sessionSeconds: 120,

  /** Falls allowed before the run ends. The 4th fall loses. */
  retries: 3,

  scoring: {
    /** Per premium coin picked up. */
    coin: 25,
    /** First time each cover point on a board is reached. Not restocked by a retry. */
    coverBonus: 60,
    /** Flat award for finishing a level. */
    levelComplete: 100,
    /** Finished in par moves or fewer. */
    parBonus: 75,
    /** Finished in exactly par + 1. */
    nearParBonus: 40,
  },

  /* -- Timing ---------------------------------------------------------------
     The clock is the second failure path, so the cost of a swipe is a balance
     constant rather than a presentation detail: scripts/balance.mjs bills the
     bot with exactly these numbers.

     A slide is animated at `slideCellsPerSecond` with a floor of
     `slideMinSeconds`, so a one-cell nudge still reads as a deliberate move
     and a seven-cell glide across the whole board takes ~0.55 s. */
  timing: {
    slideCellsPerSecond: 13,
    slideMinSeconds: 0.16,
    /* Fraction of a glide spent coming up to speed. Above zero the shield is
       shoved rather than lerped — and its mid-glide speed is 1/(1 - launch/2)
       times the average, which is the regime a per-frame collision test tunnels
       in. src/slide.js glideEase() is the curve; scripts/balance.mjs sweeps it. */
    glideLaunch: 0.22,
    /* The impact: how far the shield rebounds BACK off whatever stopped it
       before the spring settles it, in cells. Presentation only — the committed
       cell is always res.stop. */
    impactRecoilCells: 0.13,
    impactRecoilSeconds: 0.22,
    /** A swipe into a wall: the token thuds and stays put. No move is counted. */
    bonkSeconds: 0.22,
    /** Fall animation: the ice gives way and the token drops through. */
    fallSeconds: 0.85,
    /** Beat between the fall finishing and the level being re-armed. */
    respawnSeconds: 0.45,
    /** Level-cleared celebration before the next board slides in. */
    levelClearSeconds: 1.0,
    /** Beat between the run ending on screen and the results screen. */
    endBeatMs: 700,
    /** Board intro wipe. */
    levelIntroSeconds: 0.45,
  },

  /* -- Bot model (balance gate only) ---------------------------------------
     Not read by the game. scripts/balance.mjs uses these to model a player who
     knows the optimal line but occasionally swipes the wrong way. `reaction` is
     the gap between one slide finishing and the next swipe landing — 0.42 s is
     a comfortable thumb cadence, gaussian with a 0.15 s floor. */
  bot: {
    wrongSwipeRate: 0.15,
    reactionMean: 0.42,
    reactionSigma: 0.12,
    reactionMin: 0.15,
  },

  /* -- Controls -------------------------------------------------------------
     Press opens the aim, drag arms a direction, release commits. The deadzone is
     how far the thumb has to travel before a direction is armed at all — small
     enough that a flick still reads as a flick, large enough that a tap never
     commits a move by accident. */
  controls: {
    aimDeadzonePx: 14,
  },

  hud: {
    lowTimeSeconds: 20,
  },

  fx: {
    coinParticles: 12,
    crackParticles: 14,
    fallParticles: 22,
    fallShake: 8,
    windParticles: 10,
    goalParticles: 26,
    winParticles: 40,
    loseParticles: 24,
    bonkShake: 3.5,
    /** The shield slamming into a rock or the shore. */
    impactShake: 4.5,
    impactParticles: 14,
    /** Reaching a cover point, and the frost sweeping back over each fracture. */
    coverParticles: 24,
    coverFlashSeconds: 0.8,
    refreezeSeconds: 0.65,
    /** How long the commit ring stays on the shield after the thumb lifts. */
    lockSeconds: 0.34,
    hitStopSeconds: 0.05,
    /** Seconds a tile stays lit after the token crosses it. */
    tileFlashSeconds: 0.34,
    bannerSeconds: 1.2,
  },
};

/**
 * Best possible score, used by the Results ring as "a full circle".
 * Every coin, every cover point and every level at par. Derived, never
 * hand-typed, so it cannot drift from the level table.
 */
export function perfectScore(levels) {
  const s = GAME_CONFIG.scoring;
  let total = 0;
  for (const lv of levels) {
    total += s.levelComplete + s.parBonus;
    total += lv.coins.length * s.coin;
    total += lv.covers.length * s.coverBonus;
  }
  return total;
}
