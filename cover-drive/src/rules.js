// rules.js — pure chase rules for Cover Drive.
//
// No DOM, no React, no canvas. Imports only src/physics.js and
// src/deliveries.js (both pure), so scripts/balance.mjs can drive a whole
// innings headless through exactly the functions the canvas component calls.
// The component owns pixels and timers; this file owns "what just happened and
// is the chase alive".
//
// The one thing to notice: this file NEVER looks at a stopwatch. It hands the
// swing to sweepContact() and reads back where on the blade the ball struck.
// Runs come from that band crossed with the zone the player aimed at. There is
// no second, parallel notion of "good timing" that could disagree with the
// picture, which is the defect the 2026-08-03 review was describing.

import { classifyContact, sweepContact, SHOT, zoneForAim } from './physics.js';

export { SHOT };

/** A fresh innings. Everything mutable about the chase lives in this object. */
export function createInnings() {
  return {
    runs: 0,
    balls: 0,
    wickets: 0,
    boundaries: 0,
    perfects: 0,
    /** Wicket shields in hand (from a middled Protection Cover). */
    shield: 0,
    shieldSaves: 0,
    bestStreak: 0,
    streak: 0,
    /** Runs banked per zone key — the results screen's summary table. */
    zoneRuns: {},
    zoneShots: {},
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
 * @param {object} swing     { swung, tapSeconds, aim } — aim is the tap's x as
 *                           a fraction of the canvas width, 0..1
 * @param {()=>number} rand  for the catch / inside-edge rolls only
 * @param {object} [contactOut] optional scratch for the contact record
 * @returns {object} event   what to show on screen; never null
 */
export function resolveBall(state, cfg, delivery, swing, rand, contactOut) {
  const contact = sweepContact(cfg, delivery, swing, contactOut);
  const shot = classifyContact(cfg, contact);
  const played = !!(swing && swing.swung);
  const zone = zoneForAim(cfg, played ? swing.aim : 0.5);

  let runs = 0;
  let wicket = false;
  let caught = false;
  let bowled = false;
  let gainedShield = false;
  let label;
  let detail;

  if (shot === SHOT.MISS) {
    // Beaten, or left alone. Out only if the ball was on the stumps — which the
    // length marker told you before the run-up.
    bowled = delivery.stumpLine;
    wicket = bowled;
    label = bowled ? 'BOWLED!' : played ? 'BEATEN' : 'LEFT IT';
    detail = bowled
      ? 'Through the gate'
      : played ? 'Swung through fresh air' : 'Outside the line, no harm';
  } else {
    runs = zone.runs[shot] || 0;
    const catchChance = zone.catch[shot] || 0;
    caught = catchChance > 0 && rand() < catchChance;

    if (shot === SHOT.EDGE && !caught) {
      // An edge can also carry to the keeper whatever the zone was aimed at:
      // the ball came off the toe or the splice, not the middle.
      caught = rand() < cfg.risk.edgeWicketChance;
    }

    if (caught) {
      runs = 0;
      wicket = true;
      label = 'CAUGHT!';
      detail = zone.aerial ? 'Straight down deep midwicket’s throat' : 'Picked out the fielder';
    } else if (shot === SHOT.PERFECT) {
      state.perfects += 1;
      if (runs >= 4) state.boundaries += 1;
      label = runs >= 6 ? 'SIX!' : runs >= 4 ? 'FOUR!' : `${runs} RUNS`;
      detail = `Middle of the bat — ${zone.short}`;
      if (zone.grantsShield && state.shield < cfg.cover.maxShields) {
        state.shield += 1;
        gainedShield = true;
        detail = 'Cover secured';
      }
    } else if (shot === SHOT.GOOD) {
      if (runs >= 4) state.boundaries += 1;
      label = runs >= 4 ? 'FOUR!' : runs === 1 ? 'SINGLE' : `${runs} RUNS`;
      detail = `Worked away — ${zone.short}`;
    } else {
      label = runs > 0 ? `EDGED FOR ${runs}` : 'THICK EDGE';
      detail = runs > 0 ? 'Off the toe, but it ran away' : 'Squirts away, no run';
    }
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
  if (played) {
    state.zoneShots[zone.key] = (state.zoneShots[zone.key] || 0) + 1;
    if (runs > 0) state.zoneRuns[zone.key] = (state.zoneRuns[zone.key] || 0) + runs;
  }

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
    zone,
    runs,
    boundary: runs >= 4 ? runs : 0,
    wicket,
    caught,
    bowled,
    shielded,
    gainedShield,
    label,
    detail,
    contact,
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
 * The zone whose expected value best covers the required rate, with the least
 * risk that still gets there.
 *
 * Shipped rather than kept in the sim on purpose: the balance bot picks its
 * zones with this, and so does the in-game coach chip that suggests a zone when
 * the required rate climbs. If the suggestion and the bot ever disagreed, the
 * gate would be measuring a game nobody is being taught to play.
 */
export function suggestZone(state, cfg) {
  const need = requiredRate(state, cfg);
  const zones = cfg.zones;
  const risk = (z) => (z.catch.good || 0) + (z.catch.perfect || 0);

  // Take the least risk that still gets there. A zone "covers" the rate if even
  // a merely-good shot into it keeps up; failing that, one whose middled payout
  // does. Only when nothing covers it does the bat go for the biggest number on
  // the field and accept the catch risk — which is exactly the moment a real
  // chase forces a real financial decision.
  const covers = (band) => zones
    .filter((z) => z.runs[band] >= need)
    .sort((a, b) => risk(a) - risk(b) || b.runs.perfect - a.runs.perfect)[0];

  // One wicket from the end with no shield in hand, the correct play is to buy
  // cover rather than runs — as long as the chase can survive the slower rate.
  const shieldZone = zones.find((z) => z.grantsShield);
  if (shieldZone && state.shield === 0 && state.wickets >= cfg.chase.wickets - 1
    && need <= shieldZone.runs.perfect) {
    return shieldZone;
  }

  if (Number.isFinite(need)) {
    const safe = covers('good');
    if (safe) return safe;
    // Nothing keeps up on a merely-good shot. Take the best expected return
    // instead of the least risk: a low-risk zone that cannot reach the target
    // is not actually the safe option, it is just a slower loss.
    const stretch = zones
      .map((z) => ({
        z,
        ev: 0.5 * z.runs.perfect * (1 - (z.catch.perfect || 0))
          + 0.4 * z.runs.good * (1 - (z.catch.good || 0)),
      }))
      .sort((a, b) => b.ev - a.ev)[0];
    if (stretch) return stretch.z;
  }
  return zones.reduce((a, b) => (b.runs.perfect > a.runs.perfect ? b : a));
}

/**
 * The stats contract handed to onWin/onLose. `runs` is what the CRM records for
 * this game; `zoneRuns` drives the results screen's summary table.
 */
export function statsOf(state) {
  return {
    runs: state.runs,
    boundaries: state.boundaries,
    wickets: state.wickets,
    perfects: state.perfects,
    shieldSaves: state.shieldSaves,
    zoneRuns: { ...state.zoneRuns },
  };
}
