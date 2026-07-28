---
type: project
title: Income Pipeline
description: Pipe-rotation flow-routing puzzle across three boards (4x4, 5x5, 6x6) where a salary tap must be connected to one to three goal tanks before a payday clock triggers the flow, and every open pipe end on the live route leaks income away.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/income-pipeline
tags:
  - game
  - puzzle
  - pipe-rotation
  - flow-routing
timestamp: 2026-07-29
---

# Income Pipeline

Three boards, one thumb. Every grid cell holds a pipe tile — straight, elbow, tee,
or a fixed cross junction — and a tap turns one tile 90 degrees clockwise. A
salary tap feeds the left edge; one to three goal tanks (Education, Home,
Retirement) hang off the right. A payday clock runs down per board: 18s on the
4x4, 22s on the 5x5, 26s on the 6x6. When it hits zero — or the instant every
tank connects, whichever comes first — the money flows cell by cell through
whatever pipe is standing.

Win by filling all six tanks across all three boards. Lose if any board ends with
zero tanks filled, or if the 120-second session cap expires. A full-length run
lands around 71s.

## Financial hook

Income does not fail because it is too small; it fails because it never reaches
the goal. The board makes that literal:

- **Tanks are the goals and they are at the far end.** Education, Home and
  Retirement do not fill because you earned; they fill because you built a route
  to them. The salary tap is on the left and it never moves.
- **Leaks are the whole argument.** Every open pipe end on the live path sprays
  income onto the floor at -25 a piece. Nobody loses money to a dramatic event
  here — they lose it to a tee arm nobody bothered to close.
- **Finishing early is a trap as well as a bonus.** The flow triggers the moment
  the last tank connects, so the fastest route is not the richest one. Close the
  spare ends *before* you close the final join, or you bank the early-finish
  bonus while three arms bleed 75 points into the carpet. Speed without tidiness
  is exactly how a real salary evaporates.
- **A fixed cross junction cannot be turned.** Some parts of a financial life are
  not yours to rotate; you route around them, and the game never punishes you for
  one you did not open into.

## The three boards

| level | grid | tanks | payday clock | tap budget at 0.9s/tap | measured par |
|---|---|---|---|---|---|
| 1 | 4x4 | Education | 18s | 20 | 4–7 (mean 5.7) |
| 2 | 5x5 | Education, Home | 22s | 24 | 4–9 (mean 6.9) |
| 3 | 6x6 | Education, Home, Retirement | 26s | 28 | 4–11 (mean 8.6) |

Scoring: tank filled **+150**, open pipe end on the live path **-25** each, early
finish **+5** per whole second left. Six tanks with zero leaks is 900, which is
what the Results ring treats as a full circle. Stats contract:
`{ score, tanksFilled, leaks, moves }`.

## Shape of the build

- `src/flow.js` — the rules, as pure data. Tile masks and rotation, flow
  resolution (BFS from the inlet where two pipes join only when BOTH faces are
  open), leak counting, level scoring, the exact optimal solver, and both balance
  bots. No React, DOM, canvas or colour imports.
- `src/levels.js` — level construction, same purity rule: carve a tree from the
  inlet to every tank mouth, read each tile's shape off the tree, fill the rest
  with decoys, spin the tree tiles, verify.
- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable: the level table,
  generation knobs, scoring, flow timings, bot weights, effect counts.
- `src/IncomePipelineGame.jsx` — canvas presentation only. Measures the board,
  draws what `flow.js` says is happening, routes taps back in.
- `src/Screens.jsx` — Home (the board itself as inline SVG with money running a
  real route into two filling tanks), How to Play (3-beat CSS-animated SVG),
  Results (routed-score ring, tanks/leaks/taps tiles, Book a Slot / Retry / Home).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance and solvability gate; not part of the bundle.

## Level generation: solved, then broken

Boards are built solved and then broken, never the other way round.

1. Carve a tree through the grid from the salary inlet to every tank mouth
   (randomised DFS biased toward the target).
2. Read each tree tile's required port mask straight off that tree — degree 2 in
   line is a straight, degree 2 around a corner an elbow, degree 3 a tee, degree
   4 a cross — and set it to the rotation that shows it.
3. Fill every unused cell with a weighted decoy (34% straight, 34% elbow, 22%
   tee, 10% cross).
4. Spin the tree tiles by random amounts until the board's distance back to that
   layout lands in the level's scramble band.

Solvability is therefore guaranteed by construction: there is always at least one
winning configuration, because the board was one a moment ago.

## Par: an exact solver, not a brute BFS

A brute BFS over rotation states is not available — a 6x6 board has 4^36 of them
— but the problem collapses. Taps are per-tile and independent, and winning only
asks for **connectivity**, so every tile outside the eventual network can be left
alone at zero cost. What remains is a minimum-cost tree spanning the inlet and
every tank mouth, where a tile's cost depends on the rotation it ends up in: a
node-weighted Steiner tree with port-dependent node costs.

`flow.js minRotationsToSolve()` solves that exactly with the Dreyfus-Wagner DP —
`dp[terminalSubset][tile][rotation]`, 16 x 36 x 4 states, subsets merged at a
shared tile and grown by Dijkstra rather than plain BFS because a tap costs 1 to
3 depending on how far the tile has to swing. About a millisecond.

That result is **stronger** than the brief asked for. The brief wanted the
scramble to be at least 4 rotations from *the* solution; this measures the
distance to the *nearest* solution, decoy shortcuts included, so a scramble
cannot slip through by happening to be solvable a different way.

## Balance

`node scripts/balance.mjs` generates boards with the shipped generator, grades
every one of them with the shipped solver, and plays them with two bots at the
brief's 0.9s per rotation. Exit code 1 on any gate failure.

Measured over 300 runs (900 generated levels), seed `0x1e0c0de`:

| | L1 | L2 | L3 | all |
|---|---|---|---|---|
| par | 4–7 | 4–9 | 4–11 | 4–11 (mean 7.1) |
| scramble distance | 4–7 | 5–9 | 7–11 | 4–11 (mean 7.9) |
| greedy bot solves | 99.7% | 95.7% | 80.0% | **78.7%** of runs |
| random-rotate bot | 0.7% | 0.0% | 0.0% | **0.0%** of runs |

Par band violations 0, levels born already solved 0, stored solutions that do not
win 0, cached-vs-recomputed mismatches 0. Greedy runs take 20.6–59.0s of the 120s
cap (mean 33.6s) and 17–57 taps (mean 28.5). Stable across seed streams: 75.0 /
76.3 / 76.0% at seeds 1 / 999 / 424242, and 77.1% over 1500 runs.

The greedy bot is deliberately myopic — it evaluates every single-tile rotation,
takes the best gain per tap, and has no lookahead, no plan and no undo history.
Two things had to be right for it to be a meaningful player model rather than a
random walk, and both are documented at length in the game README's "Balance
notes": scoring the *half-finished join* so a one-tap-at-a-time gradient exists
at all (without it, 5% of seeds solved), and a short tabu on the tile an escape
tap just touched (without it, 11% of level-3 boards deadlocked, breaking a join
and immediately putting it back).

## Colour grammar

Gold is money in motion — the flow inside the pipe and the Retirement tank. Blue
is the plumbing you own: dry pipe metal, the Education and Home tanks. Orange is
the player's own hand: the tile under the finger, the payday clock, the salary
tap. Red is loss, and only ever loss: an open pipe end spraying income onto the
floor. Green is reserved for a tank that is full, so green always means "a goal is
funded". Fixed cross junctions are violet, the one colour that means "not yours to
turn".

## Ports and commands

Dev server on **5060**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs --runs 1500`.
