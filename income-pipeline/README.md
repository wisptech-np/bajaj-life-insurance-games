# Income Pipeline

> Route every rupee of income to the goals that matter — before payday flows, seal the leaks.

A pipe-rotation flow-routing puzzle. Three boards, a salary tap on the left edge, one to three
goal tanks on the right, and a payday clock that will not wait.

Dev port **5060**.

## Concept

Every grid cell holds a pipe tile — straight, elbow, tee, or a fixed cross junction. A tap turns
one tile 90 degrees clockwise. The board is generated **solved and then broken**: a tree is carved
from the salary inlet to every tank mouth, each tile on it is given the exact shape that tree needs,
the remaining cells are filled with decoy pipe, and then the tree tiles are spun by random amounts.
Solvability is guaranteed by construction, because the board was a solution a moment ago.

When the payday clock hits zero — or the instant every tank connects, whichever comes first — the
money flows, cell by cell, through whatever pipe is standing. Tanks that are reached fill. Every
open pipe end on the live path sprays income onto the floor.

That last rule is the whole design tension. The flow triggers the moment the last tank connects, so
the fastest route is not the richest one: connect carelessly and you bank the early-finish bonus
while three spare tee arms bleed 75 points into the carpet. Sealing the ends **before** you close
the final join is the skill.

## Financial hook

Income does not fail because it is too small; it fails because it never reaches the goal. Education,
Home and Retirement are tanks at the far end of a pipe you have to build, and the leaks — the spare
open ends nobody bothered to close — are the money that quietly never arrives. The game rewards
routing income *deliberately*, and it charges you for every end left open.

## Controls

- **Tap a tile** — rotate it 90 degrees clockwise.
- Cross junctions look identical in every orientation, so they are drawn locked and a tap on one
  says `FIXED JUNCTION` instead of charging you a move for nothing.
- Taps are locked while the money is flowing.

## Rules

| | |
|---|---|
| Levels | 3 — 4x4 (1 tank, 18s), 5x5 (2 tanks, 22s), 6x6 (3 tanks, 26s) |
| Session cap | 120s (a full-length run lands around 71s) |
| Win | Fill **all 6 tanks** across all three levels |
| Lose | Any level ends with **zero** tanks filled, or the 120s session clock expires |

## Scoring

| Event | Points |
|---|---|
| Tank filled | +150 |
| Open pipe end on the live flow path | −25 each |
| Early finish (all tanks connected before the clock) | +5 per whole second remaining |

A perfect run — six tanks, zero leaks — is 900 before the early-finish bonus, which is what the
Results ring treats as a full circle.

Stats contract: `{ score, tanksFilled, leaks, moves }`.

## Architecture

The rules are not in the React component.

| File | Contents |
|---|---|
| `src/flow.js` | Tile masks, rotation, flow resolution, leak counting, level scoring, the exact optimal solver, and both balance bots. No React, DOM, canvas or colour imports. |
| `src/levels.js` | Level construction: carve, shape, decorate, scramble, verify. Same purity rule. |
| `src/data.js` | Every tunable — palette, level table, scoring, flow timings, bot weights, effect budgets. |
| `src/IncomePipelineGame.jsx` | Canvas presentation only: measures the board, draws what `flow.js` says is happening, routes taps back in. |
| `scripts/balance.mjs` | Headless gate. Imports the shipped modules; never re-implements a rule. |

## Balance notes

`node scripts/balance.mjs` is the gate. It generates boards with the shipped generator, grades every
one of them with the shipped solver, and plays them with two bots at the brief's 0.9s per rotation
(a per-level budget of 20 / 24 / 28 taps).

**Solvability.** `minRotationsToSolve()` reports *par*: the fewest taps that turn a board into one
where every tank fills. A brute BFS over rotation states is impossible — a 6x6 board has 4^36 of
them — but the problem collapses. Taps are per-tile and independent, and winning only asks for
connectivity, so every tile outside the eventual network can be left alone at zero cost. What
remains is a minimum-cost tree spanning the inlet and every tank mouth where a tile's cost depends
on the rotation it lands in: node-weighted Steiner tree with port-dependent costs, which the
Dreyfus-Wagner DP solves exactly over 16 terminal subsets x 36 tiles x 4 rotations, with Dijkstra
(not plain BFS) for the growth step because a tap costs 1 to 3 depending on how far the tile swings.

This is stronger than the brief's "at least 4 rotations from the solution": it measures distance to
the *nearest* solution, decoy shortcuts included, so a scramble cannot slip through the gate by
happening to be solvable a different way.

**Measured** (300 runs, seed `0x1e0c0de`, 900 generated levels):

| | L1 (4x4) | L2 (5x5) | L3 (6x6) | all |
|---|---|---|---|---|
| par | 4–7 (mean 5.7) | 4–9 (mean 6.9) | 4–11 (mean 8.6) | 4–11 (mean 7.1) |
| scramble distance | 4–7 | 5–9 | 7–11 | 4–11 (mean 7.9) |
| tap budget | 20 | 24 | 28 | |
| greedy bot solves | 99.7% | 95.7% | 80.0% | **78.7%** of runs |
| random-rotate bot | 0.7% | 0.0% | 0.0% | **0.0%** of runs |

Par band violations: 0. Levels born already solved: 0. Levels whose stored solution does not win: 0.
Greedy runs take 20.6–59.0s of the 120s cap (mean 33.6s) and 17–57 taps (mean 28.5).

Stable across seed streams: 75.0 / 76.3 / 76.0% at seeds 1 / 999 / 424242, and 77.1% over 1500 runs.

**Why the greedy bot needed a real gradient.** Two neighbouring tiles must *both* open toward each
other before a single drop crosses between them, so from any position no single rotation moves the
live flow one cell closer — turning the frontier tile does nothing until the next tile turns, and
vice versa. A hill-climber on live flow alone sees a flat plateau everywhere and collapses into a
random walk: measured at 5% of seeds. The bot therefore scores the half-finished join. With `A` the
relaxed tile-distance from the live flow to the tank, and the board "aimed" when a live pipe end
already sprays into a tile strictly closer than `A`, the cost `2A - aimed` falls by exactly one on
the tap that aims and by one again on the tap that accepts.

It stays myopic. The relaxation lets it believe a route is open when the tiles on it are needed in
two shapes at once, when they would cost three taps each, or when a branch to another tank has
already claimed them — and discovering that costs taps against the clock. A short tabu on the tile
an escape tap just touched is also load-bearing: without it the bot deadlocked on 11% of level-3
boards, breaking a join and immediately putting it back because that was the biggest available gain.

## Build

```
pnpm install
pnpm dev          # http://localhost:5060
pnpm build        # vite build --mode uat — the hard gate
node scripts/balance.mjs            # balance + solvability gate, exit 1 on failure
node scripts/balance.mjs --runs 1500 --verbose
```
