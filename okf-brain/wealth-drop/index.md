---
type: project
title: Wealth Drop
description: Plinko/pachinko board drop where a gold premium coin bounces through ten rows of pegs into goal pockets, and blue cover pegs turn a x0 Market Risk pocket into a x1 payout.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/wealth-drop
tags:
  - game
  - plinko
  - physics
  - arcade
timestamp: 2026-07-28
---

# Wealth Drop

One-thumb plinko. Drag along the rail at the top of the board to choose where a
gold premium coin enters, release to drop it, and watch circle physics carry it
through ten staggered rows of glowing pegs into one of nine goal pockets. Ten
coins or a 90-second cap, whichever runs out first. Score is the total payout;
win at 2,500.

## Financial hook

Market volatility and ULIP. You choose an entry point and then you choose nothing
else — the rest is a hundred small deflections, which is what a market does to a
disciplined investment. The geometry carries the argument:

- Retirement x5 is pinned to the two outer edges with a red **Market Risk x0**
  band between it and the safe centre, so reaching for the highest return means
  aiming across volatility.
- Home x3 sits alone in the middle: steady, never spectacular, and where a coin
  that drifts nowhere lands.
- A blue **cover peg** shields the coin for the rest of its drop, and a shielded
  coin is paid **x1 by a Risk pocket instead of x0**. It never turns a x0 into a
  x5. Insurance does not raise the ceiling, it lifts the floor — and the cover
  pegs sit in the outer columns of the lower rows, on the path of exactly the
  coins that need them.
- Ten coins rather than one: a single drop is a coin flip, ten drops is a
  strategy, and the streak bonus pays discipline.

## Pocket ladder

| lane | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| pocket | Retirement | Savings | Market Risk | Education | Home | Education | Market Risk | Savings | Retirement |
| multiplier | x5 | x1 | x0 | x2 | x3 | x2 | x0 | x1 | x5 |

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable: pocket ladder, board
  geometry fractions, peg rows and spacing, restitution and the rest of the
  physics, cover-peg slots, combo weights, the 2,500 win line, the 90 s session,
  every effect count.
- `src/WealthDropGame.jsx` — the whole game in one canvas component with mutable
  state in refs. The region between the `PURE-PHYSICS` markers (board layout,
  cover-peg arming, the coin step, payout resolution) is free of React, canvas,
  DOM and imports, so `tools/balance-sim.mjs` can slice it out and execute it
  verbatim under Node.
- `src/Screens.jsx` — Home (the board itself as inline SVG with a coin tracing a
  real path down it), How to Play (3-beat CSS-animated SVG), Results (payout ring
  against the target, coins/saves/streak tiles, Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`, never edited in place.
- `tools/balance-sim.mjs` — the balance gate; not part of the bundle.

## Colour grammar

Red is risk — the two x0 pockets are the only things on screen that can take your
money, and they pulse continuously. Blue is protection: the peg field, the cover
pegs, the coin's shield aura. Gold is wealth: the coin and the Retirement
pockets. Orange is the player's own hand — the aim rail and the drop marker.
Green is reserved for progress toward the target, so green always means "you are
winning" and never means a hazard.

## Balance

`tools/balance-sim.mjs` runs the shipping physics headless and exits non-zero if
the casual win rate leaves the 35-45% band. Measured over 20,000 runs per
profile at 407x612: centre-tap 44.4% win, casual (middle three lanes) 40.2%,
spread 45.8%, against a 2,500 target and means of 2399 / 2347 / 2426. Risk
pockets take 19.5% of coins from a centre drop, 46.1% of those are rescued by
cover, so 10.5% of all coins pay nothing. Casual win rate is 41.1% at 407x556
and 36.1% at 338x452, so the win line holds across handset sizes.

Four numbers were corrected after measurement, each commented at its definition
in `data.js` and expanded in the game README's "Balance notes": wall pegs added
to the boundary rows (an unguarded rail gutter was funnelling 15-19% of drops
into the x5 pockets), `lateralDrag`/`maxLateralSpeed` added (without them the
landing distribution was flat and the aim rail did nothing), the pocket ladder
rearranged from `[5 3 0 2 1 2 0 3 5]` to `[5 1 0 2 3 2 0 1 5]` (the obvious
ladder made hugging a wall twice as good as any other aim), and two
size-relative clamps (`maxRowGapFrac`, `maxStepFraction`) so a very tall or very
narrow canvas is the same game and cannot tunnel a coin through a peg.

## Ports and commands

Dev server on **5039**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node tools/balance-sim.mjs --runs 20000 --sweep`.
