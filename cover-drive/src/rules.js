// rules.js — pure chase rules for Cover Drive.
//
// No DOM, no React, no canvas. Imports only src/deliveries.js (itself pure), so
// scripts/balance.mjs can drive a whole innings headless through exactly the
// functions the canvas component calls. The component owns pixels and timers;
// this file owns "what just happened and is the chase alive".

import { timingWindows } from './deliveries.js';

export const SHOT = {
  PERFECT: 'perfect',
  GOOD: 'good',
  EDGE: 'edge',
  MISS: 'miss',
};

/**
 * Which band a swing falls in.
 * @param {number} errMs  swing time − ideal contact time, in ms. Negative = early.
 */
export function classifySwing(cfg, delivery, errMs) {
  const w = timingWindows(cfg, delivery);
  const a = Math.abs(errMs);
  if (a <= w.perfect) return SHOT.PERFECT;
  if (a <= w.good) return SHOT.GOOD;
  if (a <= w.edge) return SHOT.EDGE;
  return SHOT.MISS;
}

/** A fresh innings. Everything mutable about the chase lives in this object. */
export function createInnings() {
  return {
    runs: 0,
    balls: 0,
    wickets: 0,
    boundaries: 0,
    perfects: 0,
    /** Wicket shields in hand (from a PERFECT on a cover ball). */
    shield: 0,
    shieldSaves: 0,
    /** Alternation cursors for 4/6 and 1/2. */
    perfectSeq: 0,
    goodSeq: 0,
    bestStreak: 0,
    streak: 0,
    over: false,
    won: false,
    cause: null, // 'chased' | 'wickets' | 'balls' | 'timeout'
  };
}

/**
 * Resolve one ball and fold it into the innings.
 *
 * @param {object} state     innings from createInnings(); MUTATED
 * @param {object} cfg       GAME_CONFIG
 * @param {object} delivery  from makeDelivery()
 * @param {object} swing     { swung: boolean, errMs: number }
 * @param {()=>number} rand  for the inside-edge roll only
 * @returns {object} event   what to show on screen; never null
 */
export function resolveBall(state, cfg, delivery, swing, rand) {
  const shot = swing.swung ? classifySwing(cfg, delivery, swing.errMs) : SHOT.MISS;
  const played = swing.swung;

  let runs = 0;
  let wicket = false;
  let boundary = 0;
  let gainedShield = false;
  let label;
  let detail;

  if (shot === SHOT.PERFECT) {
    boundary = cfg.runs.boundary[state.perfectSeq % cfg.runs.boundary.length];
    runs = boundary;
    state.perfectSeq += 1;
    state.perfects += 1;
    state.boundaries += 1;
    label = boundary >= 6 ? 'SIX!' : 'FOUR!';
    detail = 'Middle of the bat';
    // A cover ball timed perfectly banks the shield. A PERFECT can never carry
    // a wicket, so granting here can never race the dismissal branch below.
    if (delivery.cover && state.shield < cfg.cover.maxShields) {
      state.shield += 1;
      gainedShield = true;
      detail = 'Cover secured';
    }
  } else if (shot === SHOT.GOOD) {
    runs = cfg.runs.good[state.goodSeq % cfg.runs.good.length];
    state.goodSeq += 1;
    label = runs === 1 ? 'SINGLE' : 'TWO';
    detail = 'Worked away';
  } else if (shot === SHOT.EDGE) {
    wicket = rand() < cfg.timing.edgeWicketChance;
    label = wicket ? 'EDGED!' : 'THICK EDGE';
    detail = wicket ? 'Feathered behind' : 'Squirts away, no run';
  } else {
    // MISS — swung and beaten, or left it. Out only if the ball was on the
    // stumps, which the length marker told you before the run-up.
    wicket = delivery.stumpLine;
    label = wicket ? 'BOWLED!' : played ? 'BEATEN' : 'LEFT IT';
    detail = wicket
      ? 'Through the gate'
      : played ? 'Fresh air, but it missed everything' : 'Outside the line, no harm';
  }

  let shielded = false;
  if (wicket) {
    if (state.shield > 0) {
      state.shield -= 1;
      state.shieldSaves += 1;
      shielded = true;
      wicket = false;
      label = 'COVERED!';
      detail = 'Your shield absorbs the wicket';
    } else {
      state.wickets += 1;
    }
  }

  state.runs += runs;
  state.balls += 1;

  if (runs > 0) {
    state.streak += 1;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
  } else {
    state.streak = 0;
  }

  // Order matters: the third wicket ends the innings even on a ball that would
  // otherwise have completed the chase. It cannot actually collide (a wicket
  // ball scores 0) but the precedence is stated rather than implied.
  if (state.wickets >= cfg.chase.wickets) {
    state.over = true;
    state.won = false;
    state.cause = 'wickets';
  } else if (state.runs >= cfg.chase.target) {
    state.over = true;
    state.won = true;
    state.cause = 'chased';
  } else if (state.balls >= cfg.chase.balls) {
    state.over = true;
    state.won = false;
    state.cause = 'balls';
  }

  return {
    shot,
    played,
    runs,
    boundary,
    wicket,
    shielded,
    gainedShield,
    label,
    detail,
    errMs: swing.swung ? swing.errMs : null,
    cover: delivery.cover,
    ballNo: delivery.ballNo,
  };
}

/** End the innings on the session clock. Separate from resolveBall: no ball was bowled. */
export function timeOut(state) {
  if (state.over) return state;
  state.over = true;
  state.won = false;
  state.cause = 'timeout';
  return state;
}

/** Runs still required. */
export function runsNeeded(state, cfg) {
  return Math.max(0, cfg.chase.target - state.runs);
}

/** Balls still to be bowled. */
export function ballsLeft(state, cfg) {
  return Math.max(0, cfg.chase.balls - state.balls);
}

/**
 * Required rate per ball. Infinity once the balls are gone and the target is
 * not — the HUD renders that as "—" rather than pretending it is a number.
 */
export function requiredRate(state, cfg) {
  const left = ballsLeft(state, cfg);
  if (left <= 0) return runsNeeded(state, cfg) > 0 ? Infinity : 0;
  return runsNeeded(state, cfg) / left;
}

/**
 * The stats contract handed to onWin/onLose — exactly these four keys, per the
 * spec. Anything else the HUD wants (shield saves, best streak) stays inside
 * the innings object and never leaks into the results payload.
 */
export function statsOf(state) {
  return {
    runs: state.runs,
    boundaries: state.boundaries,
    wickets: state.wickets,
    perfects: state.perfects,
  };
}
