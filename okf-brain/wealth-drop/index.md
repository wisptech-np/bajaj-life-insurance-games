---
type: project
title: Wealth Drop
description: Plinko/pachinko board drop where a gold premium coin bounces through ten rows of pegs into eleven goal pockets, with Retirement x5 sitting just beyond each Market Risk band and blue cover pegs turning a x0 into a x1 payout.
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
through ten staggered rows of glowing pegs into one of eleven goal pockets. Ten
coins or a 90-second cap, whichever runs out first. Score is the total payout;
win at 2,700.

## Financial hook

Market volatility and ULIP. You choose an entry point and then you choose nothing
else - the rest is a hundred small deflections, which is what a market does to a
disciplined investment. The geometry carries the argument:

- The **Retirement x5** jackpots sit immediately OUTSIDE each red Market Risk
  band, not at the wall and not in the middle. Aiming for one means aiming
  across volatility and stopping there.
- **Overshoot lands in the savings gutter** - the two outer lanes on each side
  pay x1. Chasing the edge of the market is not a shortcut: measured, parking
  against a wall wins 22% of runs against 40% for someone who just plays the
  middle.
- **The disciplined middle is the best play and it is still only ~40%.** Home x3
  and Education x2 hold the centre; regular, unspectacular investing is what
  actually funds the goals, and nothing here guarantees a win.
- A blue **cover peg** shields the coin for the rest of its drop, and a shielded
  coin is paid **x1 by a Risk pocket instead of x0**. It never turns a x0 into a
  x5. Insurance does not raise the ceiling, it lifts the floor - and the cover
  pegs sit in the outer columns of the lower rows, on the path of exactly the
  coins that have drifted toward a Risk band.
- Ten coins rather than one: a single drop is a coin flip, ten drops is a
  strategy, and the streak bonus pays discipline.

## Pocket ladder

| lane | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pocket | Savings | Savings | Retirement | Market Risk | Education | Home | Education | Market Risk | Retirement | Savings | Savings |
| multiplier | x1 | x1 | x5 | x0 | x2 | x3 | x2 | x0 | x5 | x1 | x1 |

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable: pocket ladder, board
  geometry fractions, peg rows and spacing, restitution and the rest of the
  physics, cover-peg slots, combo weights, the 2,700 win line, the 90 s session,
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

`tools/balance-sim.mjs` runs the shipping physics headless. It measures seven aim
profiles - `wall`, `lane0`, `lane1`, `lane2`, `centre`, `casual`, `spread` - at
every canvas size, and exits non-zero unless at each size `casual` lands in
30-50% AND every edge profile stays at or under 55%.

Measured over 8,000 runs per profile at target 2,700:

| aim profile | 407x612 | 407x556 | 338x452 |
|---|---|---|---|
| wall (rail extreme) | 22.4% | 20.2% | 20.5% |
| lane 0 / 1 / 2 centre | 22.2 / 28.6 / 30.9% | 22.3 / 27.4 / 31.3% | 21.9 / 27.0 / 30.9% |
| dead centre | 35.4% | 34.0% | 34.8% |
| **casual (middle three lanes)** | **40.3%** | **38.2%** | **37.3%** |
| spread (whole rail) | 32.8% | 32.5% | 31.7% |

Casual play is the brief's ~40% line and is also the best line: every edge
profile is 10-20 points worse. Expected payout per coin by aim lane is a gentle
dome peaking at 217 against 211 at dead centre and 172 in the savings gutter, so
best/centre is 1.03 - no release point is worth more than a few percent over the
middle, while a bad aim costs ~20% of expected payout. Risk pockets take 25.4% of
coins from a centre drop, 45.3% of those are rescued by cover, so 13.9% of all
coins pay nothing.

Five numbers were corrected after measurement, each commented at its definition
in `data.js` and expanded in the game README's "Balance notes": wall pegs added
to the boundary rows (an unguarded rail gutter was funnelling 15-19% of drops
into the outer pocket); `lateralDrag`/`maxLateralSpeed` added (without them the
landing distribution was flat and the aim rail did nothing); `refFieldPx` /
`board.velScale` added so gravity and every velocity scale with the peg-field
height (without it a short handset turned the bell almost flat and moved the
wall-hugging win rate 20 points between canvas sizes); the pocket ladder moved
from a 9-lane "biggest prize outside" arrangement - a solved board where parking
on a wall won 1.5x as often as a centre drop - to the 11-lane dome; and two
size-relative clamps (`maxRowGapFrac`, `maxStepFraction`) so a very tall or very
narrow canvas is the same game and cannot tunnel a coin through a peg.

## Ports and commands

Dev server on **5039**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node tools/balance-sim.mjs --runs 8000 --sweep`.
