---
type: project
title: Slide to Safety
description: Ice-slide pathing puzzle on a 7x9 frozen lake — swipe and the shield token glides until something stops it, across five handcrafted boards with thin ice that breaks under a second crossing and a gust lane that shoves a slide one cell sideways.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/slide-to-safety
tags:
  - game
  - puzzle
  - pathfinding
  - ice-slide
timestamp: 2026-07-28
---

# Slide to Safety

Swipe up, down, left or right and a shield token glides across a frozen lake
until a rock, the shore or the family tile stops it. Five handcrafted boards on a
7 x 9 grid, one 120-second clock and three retries for the whole run. Coins are
swept up on the way past; the family tile ends the board.

## Financial hook

The shield is the cover and the lake is a life you cannot see the bottom of.

- **Thin ice is the risk you got away with once.** Crossing a crack at speed is
  safe on the first pass and the fracture visibly deepens behind you. Cross the
  same crack again — or *stop* on any crack — and you go through. That is the
  whole argument for cover in one mechanic: the near miss does not reset, it
  accumulates, and the second one is the one that costs you.
- **You get three retries for five boards.** Not per board — for the run. Second
  chances are finite and they are spent, not earned.
- **The gust is the thing you did not plan for.** It is telegraphed (a shimmer
  patrols the lane) and it is deterministic, so it is not bad luck — it is a
  known hazard you either route around or, on boards 3 and 5, deliberately ride.
  Both of those boards are measurably **unreachable** with the gust removed.
- **Par rewards planning, not speed.** Finishing a board in par pays +75 on top
  of the +100, and the par bonus is judged on the board's cumulative move count
  across retries — so drowning on purpose to reset a botched route costs the
  bonus as well as the retry.

## Boards

| # | Name | Par | Coins | Thin ice | Gust |
|---|---|---|---|---|---|
| 1 | First Steps | 6 | 4 | — | — |
| 2 | Thin Ice | 8 | 4 | 8 | — |
| 3 | Crosswind | 9 | 4 | 9 | 4 cells, row 2, pushes left |
| 4 | Cold Snap | 10 | 5 | 10 | — |
| 5 | Bring Them Home | 12 | 5 | 11 | 4 cells, row 8, pushes left |

Board 1 is deliberately hazard-free and every one of its four coins sits on the
optimal line: the teaching board rewards the obvious route rather than testing
it. Board 5 rides the gust twice, on moves 4 and 9.

Boards are ASCII maps in `src/levels.js` with a documented legend
(`.` ice, `#` rock, `S` start, `F` family, `C` coin, `X` thin ice,
`^ v < >` gust cells).

## Shape of the build

- `src/levels.js` — the five ASCII boards, the legend, the gust rules and the
  parser. Pure: no DOM, no React, no kit imports.
- `src/slide.js` — the rules. `resolveSlide()` is a *query* that walks one swipe
  and returns the whole path (cells crossed, coins picked up, thin ice deepened
  or broken, where it stopped) without mutating anything; `applySlide()` is the
  *commit*. The canvas needs the path up front to animate the glide and the state
  must not change until the token has arrived, so the split is load-bearing
  rather than stylistic. Also pure.
- `src/data.js` — `GAME_CONFIG` and `COLORS`: the clock, the retries, scoring,
  the timing model (which is a balance constant, not a presentation detail — the
  sim bills the bot with exactly these numbers), the bot model and every effect
  count.
- `src/SlideToSafetyGame.jsx` — presentation only: geometry, painting, juice and
  the run's state machine (`intro → idle → sliding → falling/clear → …`). All
  mutable state in refs, HUD through `textContent` refs, the ice field and rocks
  pre-rendered to one offscreen bitmap per board/resize.
- `src/Screens.jsx` — Home (a miniature of the real board with the token taking
  three legs of a route), How to Play (three CSS-animated SVG beats: glide, thin
  ice, gust), Results (score ring against a perfect run, boards/coins/moves
  tiles, Book a Slot / Retry / Home).
- `scripts/balance.mjs` — the solvability proof and balance gate; not bundled.

## Colour grammar

Blue is the player: the shield token and its glow — protection is the thing you
move. Green is the family tile, the only safe destination, and it is the only
green on the board. Gold is wealth (the coins). Rust-red is thin ice, the only
thing that can end a run. Orange is the player's own hand: the swipe chevrons
around the idle token. Slate is inert rock. Pale blue-white is the ice itself.

## Solvability and balance

`node scripts/balance.mjs` imports the shipping modules and never re-implements a
rule. Per board it asserts:

1. the family tile is reachable;
2. the `par` field equals the BFS optimum over the slide graph;
3. every coin lies on at least one route of length ≤ par + 2;
4. **no reachable state is a dead end** — the search enumerates every state the
   player can legally reach, *including every way they can deepen thin ice*, and
   proves the family tile is still reachable from each without drowning.

Measured (all five boards, gate PASS):

| board | BFS optimum = par | coins (min moves to a route collecting it) | reachable states | dead ends |
|---|---|---|---|---|
| First Steps | 6 | 6, 6, 6, 6 (budget 8) | 24 | 0 |
| Thin Ice | 8 | 8, 8, 8, 8 (budget 10) | 9 | 0 |
| Crosswind | 9 | 9, 9, 9, 9 (budget 11) | 10 | 0 |
| Cold Snap | 10 | 10, 10, 10, 10, 10 (budget 12) | 11 | 0 |
| Bring Them Home | 12 | 12, 12, 12, 12, 12 (budget 14) | 13 | 0 |

Every coin is on an optimal line, so a perfect run is 45 moves and 1,425 points.

Bot gate: the optimal line with 15 % wrong-swipe noise (a mis-swipe is drawn
uniformly from the directions that are *not* on an optimal line — a thumb that
flicked the wrong way, not a random walk), reaction 0.42 s ± 0.12 s gaussian.

| seeded runs | completion |
|---|---|
| 300 (default seed) | 44.3 % |
| 2,000 (0x511de5a1 / 12345 / 999331) | 43.0 % / 45.4 % / 45.4 % |

Target band 25–50 %. A losing run always dies on retries (3.0 falls per run
against 3 allowed), never on the clock: a bot that already knows the optimal line
spends 49 s of the 120 s. The clock is the *human* constraint — a player who has
to find each line, rather than replay it, is the one who runs out of time.

## Ports and commands

Dev server on **5063**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs --runs 2000`.
