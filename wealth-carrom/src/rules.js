// rules.js — the two-player match: turns, fouls, scoring, completion.
//
// Pure: no React, no DOM, no canvas. scripts/balance.mjs imports this module
// directly, so the win rates it reports are the win rates of the rules that ship
// and the bot is measured against the same state machine the player faces.
//
// The match
// ---------
// You and The Market alternate strikes at ONE shared rosette of nine gold wealth
// coins. First side to `targetCoins` coin-equivalent wins. Because nine coins
// cannot be split so that neither side reaches five, a target of five is
// GUARANTEED to produce a decisive result before the board empties — the gate
// asserts this rather than assuming it.
//
// Turn grammar is classic carrom, not alternate-every-shot: pocket something
// that counts (a gold coin, or the Queen) and commit no foul, and you KEEP the
// strike. Miss, or foul, and it passes. That is what makes a break worth
// setting up, and it is the reason a strong bot can run several coins in a row.
//
// The Queen of Protection is the whole pitch expressed as a rule. She is worth
// 500 and TWO coins toward the target, but only if she is COVERED — a gold coin
// pocketed on the same strike or on your very next one. Fail to cover and she
// goes back on the centre spot having paid nothing. Cover is only worth
// something once it is completed.

export const YOU = 'you';
export const BOT = 'bot';

/** One side's ledger. */
function createSide(id, name) {
  return {
    id,
    name,
    score: 0,
    /** Gold coins pocketed by this side. */
    coins: 0,
    /** True once this side has covered a queen she pocketed. */
    queenCovered: false,
    /** True while this side has a pocketed queen waiting to be covered. */
    queenPending: false,
    fouls: 0,
    strikes: 0,
    /** Best single-strike haul, for the results screen. */
    bestStrike: 0,
  };
}

/** A fresh match. `you` always strikes first. */
export function createMatch(cfg) {
  return {
    you: createSide(YOU, cfg.match.playerName),
    bot: createSide(BOT, cfg.match.opponentName),
    /** Whose strike it is. */
    turn: YOU,
    /** Strikes taken in the match by both sides. */
    strikes: 0,
    ended: false,
    /** YOU | BOT | null (a draw). */
    winner: null,
    /** 'target' | 'fouls' | 'cleared' | 'strikes' | 'timeout' */
    cause: null,
  };
}

/** The side whose strike it is. */
export function sideOnStrike(match) {
  return match.turn === YOU ? match.you : match.bot;
}

/** The other side. */
export function sideWaiting(match) {
  return match.turn === YOU ? match.bot : match.you;
}

/** Coins-equivalent toward the win line: a covered queen counts as two. */
export function goldEquivalent(side, cfg) {
  return side.coins + (side.queenCovered ? cfg.scoring.queenCoinEquivalent : 0);
}

/**
 * Decide a match that has run out of strikes, coins or clock.
 *
 * A ladder of tiebreaks, each one a real measure of who played the better
 * carrom, so a level scoreline resolves on merit rather than on a coin flip:
 *
 *   1. coin-equivalent — the thing the match is actually a race for;
 *   2. score — the queen and the risk discs move this when coins do not;
 *   3. fewer fouls — a clean board beats a lucky one;
 *   4. the better single strike — who found the one good break;
 *   5. fewer strikes used — who got there in less.
 *
 * Sides that are level on all five are genuinely indistinguishable and the match
 * is a draw (winner null). The gate measures how often that happens; it is well
 * under one match in fifty, and matchStats() reports `draw` so the results
 * screen can say so rather than claiming a win.
 */
function decideOnPoints(match, cfg, cause) {
  match.ended = true;
  match.cause = cause;

  const ladder = [
    [goldEquivalent(match.you, cfg), goldEquivalent(match.bot, cfg), 1],
    [match.you.score, match.bot.score, 1],
    [match.you.fouls, match.bot.fouls, -1],
    [match.you.bestStrike, match.bot.bestStrike, 1],
    [match.you.strikes, match.bot.strikes, -1],
  ];
  for (const [a, b, dir] of ladder) {
    if (a !== b) {
      match.winner = (a - b) * dir > 0 ? YOU : BOT;
      return match;
    }
  }
  match.winner = null;
  return match;
}

/**
 * Fold one settled strike into the match.
 *
 * @param {object} match  from createMatch(), mutated in place
 * @param {object} tally  {gold, risk, queen, striker} from physics.tallyPocketed
 * @param {object} cfg    GAME_CONFIG
 * @param {number} goldLeftOnBoard  active gold coins AFTER this strike
 * @returns {object} what happened, for the presentation layer
 */
export function resolveStrike(match, tally, cfg, goldLeftOnBoard) {
  const S = cfg.scoring;
  const side = sideOnStrike(match);
  side.strikes += 1;
  match.strikes += 1;

  const out = {
    by: side.id,
    delta: 0,
    foul: false,
    queenCovered: false,
    queenReturned: false,
    queenPending: false,
    coins: tally.gold,
    risk: tally.risk,
    striker: !!tally.striker,
    keepsTurn: false,
    turnPassedTo: null,
  };

  if (tally.gold > 0) {
    side.coins += tally.gold;
    out.delta += S.coinPoints * tally.gold;
  }

  if (tally.risk > 0) {
    out.delta -= S.riskPenalty * tally.risk;
    side.fouls += tally.risk;
    out.foul = true;
  }

  if (tally.striker) {
    side.fouls += 1;
    out.foul = true;
  }

  // Queen bookkeeping, per side. A queen pocketed this strike opens the cover
  // window; a gold coin in the SAME strike closes it immediately.
  if (tally.queen) side.queenPending = true;

  if (side.queenPending) {
    if (tally.gold > 0) {
      side.queenPending = false;
      side.queenCovered = true;
      out.delta += S.queenPoints;
      out.queenCovered = true;
    } else if (!tally.queen) {
      // The window was opened on an earlier strike and this one produced no
      // cover: she goes back on the centre spot, unpaid.
      side.queenPending = false;
      out.queenReturned = true;
    } else {
      out.queenPending = true;
    }
  }

  side.score = Math.max(0, side.score + out.delta);
  const haul = tally.gold + (out.queenCovered ? 1 : 0);
  if (haul > side.bestStrike) side.bestStrike = haul;

  // Classic carrom continuation: pot something that counts and stay clean, and
  // the strike is yours again.
  out.keepsTurn = (tally.gold > 0 || tally.queen) && !out.foul;

  /* -- completion, checked in priority order ---------------------------------
     Reaching the line is never taken away: the target is tested before the foul
     limit, so a strike that wins the match is a win even if it also tipped the
     striker into a pocket on the way. */
  if (goldEquivalent(side, cfg) >= S.targetCoins) {
    match.ended = true;
    match.winner = side.id;
    match.cause = 'target';
  } else if (side.fouls >= cfg.fouls.max) {
    match.ended = true;
    match.winner = side.id === YOU ? BOT : YOU;
    match.cause = 'fouls';
  } else if (goldLeftOnBoard <= 0 && !side.queenPending) {
    // No coin left to win with, and nobody at the line: decide on points.
    decideOnPoints(match, cfg, 'cleared');
  } else if (
    match.you.strikes >= cfg.match.strikesPerSide
    && match.bot.strikes >= cfg.match.strikesPerSide
  ) {
    decideOnPoints(match, cfg, 'strikes');
  }

  if (!match.ended && !out.keepsTurn) {
    match.turn = match.turn === YOU ? BOT : YOU;
    out.turnPassedTo = match.turn;
  }

  return out;
}

/** End the match on the session clock. */
export function expireMatch(match, cfg) {
  if (match.ended) return match;
  return decideOnPoints(match, cfg, 'timeout');
}

/**
 * The stats contract handed to App.
 *
 * The four fields GAME_STANDARD's results screen has always taken —
 * {score, coins, queenCovered, fouls} — are the PLAYER's and keep their meaning.
 * The match fields are additive so the results screen can show the head-to-head.
 */
export function matchStats(match, cfg) {
  return {
    score: Math.round(match.you.score),
    coins: match.you.coins,
    queenCovered: match.you.queenCovered,
    fouls: match.you.fouls,

    equiv: goldEquivalent(match.you, cfg),
    bestStrike: match.you.bestStrike,
    opponentScore: Math.round(match.bot.score),
    opponentCoins: match.bot.coins,
    opponentEquiv: goldEquivalent(match.bot, cfg),
    opponentName: match.bot.name,
    target: cfg.scoring.targetCoins,
    winner: match.winner,
    cause: match.cause,
    draw: match.ended && match.winner === null,
  };
}

/** True when the player won. A draw is not a win. */
export function playerWon(match) {
  return match.winner === YOU;
}
