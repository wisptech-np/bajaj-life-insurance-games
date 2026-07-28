// rules.js — the strike / foul / queen-cover state machine.
//
// Pure: no React, no DOM, no canvas. scripts/balance.mjs imports this module
// directly, so the win rate it reports is the win rate of the rules that ship.
//
// The queen rule is the classic carrom one and it is also the entire pitch of
// the game. Pocketing the Queen of Protection does NOT pay on its own: she has
// to be COVERED by a gold coin pocketed on the same strike or on the very next
// one. Fail to cover and she goes back on the centre spot and paid nothing.
// Cover her and she is worth 500 AND two coins toward the target — protection
// is only worth something once it is completed.

/** A fresh run. `stats()` returns the {score, coins, queenCovered, fouls} contract. */
export function createRun() {
  return {
    score: 0,
    /** Gold coins pocketed. */
    coins: 0,
    /** True once a pocketed queen has been covered. */
    queenCovered: false,
    /** True while a pocketed queen is waiting to be covered. */
    queenPending: false,
    fouls: 0,
    strikes: 0,
    /** Best single-strike haul, for the results screen. */
    bestStrike: 0,
    ended: false,
    won: false,
    /** 'target' | 'fouls' | 'strikes' | 'timeout' */
    cause: null,
  };
}

/** Coins-equivalent toward the win line: a covered queen counts as two. */
export function goldEquivalent(run, cfg) {
  return run.coins + (run.queenCovered ? cfg.scoring.queenCoinEquivalent : 0);
}

/**
 * Fold one settled strike into the run.
 *
 * @param {object} run    from createRun(), mutated in place
 * @param {object} tally  {gold, risk, queen, striker} from physics.tallyPocketed
 * @param {object} cfg    GAME_CONFIG
 * @returns {object} what happened, for the presentation layer:
 *   {delta, foul, queenCovered, queenReturned, queenPending, coins, risk, striker}
 */
export function resolveStrike(run, tally, cfg) {
  const S = cfg.scoring;
  run.strikes += 1;

  const out = {
    delta: 0,
    foul: false,
    queenCovered: false,
    queenReturned: false,
    queenPending: false,
    coins: tally.gold,
    risk: tally.risk,
    striker: !!tally.striker,
  };

  if (tally.gold > 0) {
    run.coins += tally.gold;
    out.delta += S.coinPoints * tally.gold;
  }

  if (tally.risk > 0) {
    out.delta -= S.riskPenalty * tally.risk;
    run.fouls += tally.risk;
    out.foul = true;
  }

  if (tally.striker) {
    run.fouls += 1;
    out.foul = true;
  }

  // Queen bookkeeping. A queen pocketed this strike opens the cover window;
  // a gold coin in the SAME strike closes it immediately (classic rule).
  if (tally.queen) run.queenPending = true;

  if (run.queenPending) {
    if (tally.gold > 0) {
      run.queenPending = false;
      run.queenCovered = true;
      out.delta += S.queenPoints;
      out.queenCovered = true;
    } else if (!tally.queen) {
      // The window was opened on an earlier strike and this one produced no
      // cover: she goes back on the centre spot, unpaid.
      run.queenPending = false;
      out.queenReturned = true;
    } else {
      out.queenPending = true;
    }
  }

  run.score = Math.max(0, run.score + out.delta);
  const haul = tally.gold + (out.queenCovered ? 1 : 0);
  if (haul > run.bestStrike) run.bestStrike = haul;

  // Win is checked BEFORE the foul-out: a strike that reaches the target is a
  // win even if it also tipped you over the foul limit. Reaching the line is
  // never taken away — the reachable-win requirement governs.
  if (goldEquivalent(run, cfg) >= S.targetCoins) {
    run.ended = true;
    run.won = true;
    run.cause = 'target';
  } else if (run.fouls >= cfg.fouls.max) {
    run.ended = true;
    run.won = false;
    run.cause = 'fouls';
  } else if (run.strikes >= cfg.strikesPerSession) {
    run.ended = true;
    run.won = false;
    run.cause = 'strikes';
  }

  return out;
}

/** End the run on the session clock. */
export function expireRun(run, cfg) {
  if (run.ended) return run;
  run.ended = true;
  run.won = goldEquivalent(run, cfg) >= cfg.scoring.targetCoins;
  run.cause = 'timeout';
  return run;
}

/** The stats contract handed to App: exactly {score, coins, queenCovered, fouls}. */
export function runStats(run) {
  return {
    score: Math.round(run.score),
    coins: run.coins,
    queenCovered: run.queenCovered,
    fouls: run.fouls,
  };
}
