// bot.js — the AI opponent ("The Market").
//
// Pure: no React, no DOM, no canvas. Imports only the other pure modules
// (board.js, physics.js), so scripts/balance.mjs runs THIS bot headless and the
// win rates it reports are the win rates of the opponent that ships.
//
// Algorithm — generate, simulate, rank, pick
// -----------------------------------------
// A carrom bot that only reasons geometrically plays badly, because whether a
// shot is good depends on what the whole rosette does afterwards, not on whether
// one corridor happens to be clear. So the bot does what the brief asks:
//
//   1. GENERATE. A ghost-ball pass enumerates plausible shots — for every
//      sampled striker placement on the baseline, every target piece and every
//      pocket, the ghost point is where the striker's centre must be at contact
//      for that piece to leave along the piece->pocket line. Corridors that are
//      blocked, cuts that are too thin and ghosts that fall off the felt are
//      dropped here, cheaply, before anything is simulated. A handful of break
//      shots are always appended so the bot is never without a move.
//   2. SIMULATE. The top `rollouts` candidates by geometric cost are each run to
//      rest on a CLONE of the board using the shipped stepWorld() — the same
//      physics the player's strike uses, at the same restitution and friction.
//      No rule is re-implemented here; the outcome is read with tallyPocketed().
//   3. RANK. Each simulated outcome is scored with the shipped scoring numbers
//      from data.js: coins potted, whether the queen was potted and could be
//      covered, fouls, and a small positional term for leaving the board better
//      than it was found.
//   4. PICK by skill. A strong bot takes the best-ranked shot with tight hands.
//      A weak bot picks uniformly from the top `pickFrom` shots, adds far more
//      aim and power noise, and is `foulBlindness`-likely to ignore the foul
//      penalty entirely when ranking — which is what actually makes a weak carrom
//      player weak: they pot their own striker and they take the greedy shot that
//      leaves the board a mess.
//
// Every one of those knobs is a number in data.js `GAME_CONFIG.bot`, so the
// difficulty ladder is tunable without touching this file.

import { legalStrikerX, makeStriker } from './board.js';
import { frictionK, stepWorld, launchStriker, tallyPocketed, clamp } from './physics.js';

/* ─── Geometry helpers ───────────────────────────────────── */

/** Distance from point (px,py) to segment a-b. */
export function segDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Is the corridor from a to b, `radius` wide, free of every piece but `skip`? */
export function pathClear(pieces, ax, ay, bx, by, radius, skip, clearance) {
  for (const p of pieces) {
    if (!p.active || p === skip || p.kind === 'striker') continue;
    if (segDist(ax, ay, bx, by, p.x, p.y) < (radius + p.r) * clearance) return false;
  }
  return true;
}

/** Distance from a piece to the nearest pocket centre. */
function nearestPocket(p, board) {
  let best = Infinity;
  for (const q of board.pockets) {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < best) best = d;
  }
  return best;
}

/* ─── 1. Candidate generation (ghost-ball) ───────────────── */

/**
 * Plausible shots on this board, cheapest geometric cost first.
 *
 * `power` comes out of the friction model rather than a guess: speed falls off
 * linearly with DISTANCE (dv/dx = -k, since dv/dt = -k v and dx/dt = v), so the
 * striker needs k*ds to arrive at the ghost point plus enough left over to send
 * the target k*dc further, divided by the cut cosine.
 */
export function enumerateCandidates(pieces, board, cfg) {
  const B = cfg.bot;
  const k = frictionK(cfg);
  const R = board.strikerR;
  const out = [];

  const targets = pieces.filter(
    (p) => p.active && (p.kind === 'gold' || p.kind === 'queen'),
  );
  if (!targets.length) return out;

  const span = board.baseHi - board.baseLo;
  for (let i = 0; i < B.placements; i++) {
    const sx = B.placements === 1
      ? (board.baseLo + board.baseHi) / 2
      : board.baseLo + (span * i) / (B.placements - 1);
    const sy = board.baseY;

    for (const target of targets) {
      for (const q of board.pockets) {
        const pdx = q.x - target.x;
        const pdy = q.y - target.y;
        const dc = Math.hypot(pdx, pdy);
        if (dc < 1e-6) continue;
        const ux = pdx / dc;
        const uy = pdy / dc;

        // Ghost: where the striker's centre sits at the moment of contact.
        const gx = target.x - ux * (target.r + R);
        const gy = target.y - uy * (target.r + R);
        if (gx - R < board.left || gx + R > board.right) continue;
        if (gy - R < board.top || gy + R > board.bottom) continue;

        const adx = gx - sx;
        const ady = gy - sy;
        const ds = Math.hypot(adx, ady);
        if (ds < R) continue;

        // Cut angle: how square the striker meets the target.
        const cut = (adx / ds) * ux + (ady / ds) * uy;
        if (cut < B.minCutCos) continue;

        if (!pathClear(pieces, sx, sy, gx, gy, R, target, B.clearance)) continue;
        if (!pathClear(pieces, target.x, target.y, q.x, q.y, target.r, target, B.clearance)) continue;

        const cost = (ds + dc) / board.play + (1 - cut) * B.cutCost;
        const power = k * (ds + (B.coinMargin * dc) / Math.max(cut, 0.4));
        out.push({
          x: sx,
          dirX: adx / ds,
          dirY: ady / ds,
          power,
          cost,
          target: target.kind,
          fallback: false,
        });
      }
    }
  }

  out.sort((a, b) => a.cost - b.cost);

  // Always append a few break shots. When the rosette is tight nothing above
  // survives the corridor tests, and a bot with no move would stall the match.
  const mid = (board.baseLo + board.baseHi) / 2;
  for (const frac of [0.25, 0.5, 0.75]) {
    const sx = board.baseLo + span * frac;
    let near = targets[0];
    let nd = Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.x - sx, t.y - board.baseY);
      if (d < nd) { nd = d; near = t; }
    }
    const dx = near.x - sx;
    const dy = near.y - board.baseY;
    const d = Math.hypot(dx, dy) || 1;
    out.push({
      x: sx,
      dirX: dx / d,
      dirY: dy / d,
      power: k * (d + board.play * 0.85),
      cost: 90 + frac,
      target: near.kind,
      fallback: true,
    });
  }
  if (!out.length) {
    out.push({
      x: mid, dirX: 0, dirY: -1, power: k * board.play, cost: 99,
      target: 'gold', fallback: true,
    });
  }
  return out;
}

/* ─── 2. Headless rollout ────────────────────────────────── */

/** A shallow clone of the board state — 13 plain objects, cheap to copy. */
function clonePieces(pieces) {
  const out = new Array(pieces.length);
  for (let i = 0; i < pieces.length; i++) out[i] = { ...pieces[i] };
  return out;
}

/**
 * Run one candidate to rest on a clone and report what it did.
 *
 * Uses the shipped stepWorld() at `cfg.bot.simStep`. A coarser step than the
 * render loop's 1/120 costs nothing in fidelity — stepWorld sizes its substep
 * count from dt, so a bigger dt simply takes more substeps and the trajectory is
 * the same — and it halves the tick overhead, which is what keeps a 26-candidate
 * search inside one frame.
 */
export function rolloutShot(pieces, board, cfg, cand) {
  const B = cfg.bot;
  const sim = clonePieces(pieces);

  // The striker is always index 0 by construction (see the component and the
  // gate); rebuild it at a legal placement rather than trusting cand.x, because
  // the placement grid can land on a coin resting on the baseline.
  const placed = legalStrikerX(board, sim, cand.x);
  sim[0] = makeStriker(board, cfg, placed);
  // Nothing on the clone has been counted yet, whatever the live board thinks.
  for (const p of sim) p.counted = false;

  launchStriker(sim[0], cand.dirX, cand.dirY, cand.power / board.scale, board, cfg);

  const dt = B.simStep;
  const limit = B.simSeconds;
  let t = 0;
  const NO_EVENTS = {};
  while (t < limit) {
    if (!stepWorld(sim, board, cfg, dt, NO_EVENTS)) break;
    t += dt;
  }

  const tally = tallyPocketed(sim);

  // Positional term: did the shot leave the remaining coins closer to a pocket
  // than it found them? Cheap proxy for "left the board in good shape".
  let before = 0;
  let after = 0;
  for (let i = 1; i < pieces.length; i++) {
    const a = pieces[i];
    const b = sim[i];
    if (a.kind !== 'gold') continue;
    if (a.active) before += nearestPocket(a, board);
    if (b.active) after += nearestPocket(b, board);
    else after += 0;
  }

  return { tally, placed, approach: after - before, settle: t };
}

/* ─── 3. Ranking ─────────────────────────────────────────── */

/**
 * What an outcome is worth to the side taking the shot.
 *
 * Uses the scoring numbers from data.js so the bot values a coin, the queen and
 * a foul at exactly the rates the rules pay them, rather than at a second set of
 * weights that could drift away from the game.
 *
 * `blindToFouls` is the difficulty lever that matters most: a weak carrom player
 * is not someone who aims badly so much as someone who does not price the
 * downside of a shot. With it set, striker-in and risk-disc outcomes cost
 * nothing in the ranking, so the bot cheerfully takes them.
 */
export function scoreOutcome(res, cfg, ctx) {
  const S = cfg.scoring;
  const B = cfg.bot;
  const t = res.tally;
  let v = 0;

  v += t.gold * S.coinPoints;

  if (t.queen) {
    // A queen potted alongside a coin is covered immediately and pays in full.
    // Potted alone she keeps the strike (so she can be covered next shot) but is
    // worth nothing at all if there is no coin left on the board to cover with.
    if (t.gold > 0) v += S.queenPoints;
    else if (ctx.goldLeft > 0) v += S.queenPoints * B.queenPendingFactor;
    else v -= S.coinPoints;
  }

  if (!ctx.blindToFouls) {
    v -= t.risk * (S.riskPenalty + B.foulCost);
    if (t.striker) v -= B.foulCost;
  }

  // Keeping the strike is worth a lot: it is another whole turn.
  const keepsTurn = (t.gold > 0 || t.queen) && t.risk === 0 && !t.striker;
  if (keepsTurn) v += B.keepTurnBonus;

  // Small nudge toward shots that leave the remaining coins near a pocket.
  v -= res.approach * B.approachWeight;

  // A shot that wins the match outright dominates everything else.
  if (ctx.equivNow + t.gold + (t.queen && t.gold > 0 ? S.queenCoinEquivalent : 0) >= S.targetCoins) {
    v += B.winBonus;
  }
  return v;
}

/* ─── 4. Choose ──────────────────────────────────────────── */

/** Resolve a difficulty name to its tuning row, falling back to the default. */
export function difficultyOf(cfg, name) {
  const levels = cfg.bot.levels;
  return levels[name] || levels[cfg.bot.defaultLevel];
}

/**
 * Pick a shot.
 *
 * @param pieces  live board (index 0 is the striker)
 * @param board   from buildBoard
 * @param cfg     GAME_CONFIG
 * @param level   difficulty row from difficultyOf()
 * @param rand    () => [0,1) — seeded in the gate, Math.random in the game
 * @param ctx     {equivNow} the shooting side's coin-equivalent so far
 * @returns {{x,dirX,dirY,power,ranked,considered}|null}
 */
export function chooseShot(pieces, board, cfg, level, rand, ctx = {}) {
  const B = cfg.bot;
  const cands = enumerateCandidates(pieces, board, cfg);
  if (!cands.length) return null;

  const goldLeft = pieces.filter((p) => p.active && p.kind === 'gold').length;
  const blindToFouls = rand() < level.foulBlindness;
  const evalCtx = {
    goldLeft,
    blindToFouls,
    equivNow: ctx.equivNow || 0,
  };

  const budget = Math.min(level.rollouts, cands.length, B.maxCandidates);
  const scored = [];
  for (let i = 0; i < budget; i++) {
    const c = cands[i];
    const res = rolloutShot(pieces, board, cfg, c);
    scored.push({ cand: c, value: scoreOutcome(res, cfg, evalCtx), res });
  }
  scored.sort((a, b) => b.value - a.value);

  // Skill: a strong bot takes the best shot it simulated; a weak one takes any
  // of the top `pickFrom`, which is how a mediocre player actually loses — not
  // by aiming badly at the right shot but by choosing the wrong shot.
  const pool = Math.max(1, Math.min(level.pickFrom, scored.length));
  const chosen = scored[Math.floor(rand() * pool)];
  const c = chosen.cand;

  // Hands: aim and power noise on top of the decision.
  const a = Math.atan2(c.dirY, c.dirX) + gauss(rand) * level.aimSigmaDeg * (Math.PI / 180);
  const power = c.power * (1 + gauss(rand) * level.powerSigma);

  return {
    x: legalStrikerX(board, pieces, c.x),
    dirX: Math.cos(a),
    dirY: Math.sin(a),
    // launchStriker takes AUTHORED power and applies board.scale itself; the
    // planner works in this board's pixels, so divide it back out here.
    power: clamp(power / board.scale, cfg.physics.minPower, cfg.physics.maxPower),
    ranked: scored.length,
    considered: cands.length,
    blindToFouls,
  };
}

/** Box-Muller normal deviate. Local copy so bot.js needs no extra import. */
function gauss(rand) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * A deliberately unskilled reference opponent: a legal random flick.
 *
 * Not used in the game. The gate plays it against every difficulty so "the bot
 * is beatable and not trivial" is measured against a fixed floor rather than
 * against another tuning of itself — if a difficulty cannot beat random, it is
 * broken, and if random can never beat it, it is not a game.
 */
export function randomShot(pieces, board, cfg, rand) {
  const x = legalStrikerX(board, pieces, board.baseLo + rand() * (board.baseHi - board.baseLo));
  // Fire into the half-plane in front of the baseline, never backwards into the
  // near rail, so a random shot is a bad shot rather than a wasted one.
  const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 0.92;
  const P = cfg.physics;
  return {
    x,
    dirX: Math.cos(a),
    dirY: Math.sin(a),
    power: P.minPower + rand() * (P.maxPower - P.minPower),
  };
}
