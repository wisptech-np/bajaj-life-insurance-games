---
type: project
title: Slide to Safety
description: Ice-slide pathing puzzle on a 7x9 frozen lake — hold to aim and the full route previews, release and the shield glides until something stops it. Five handcrafted boards with thin ice that breaks under a second crossing, a gust lane that shoves a slide sideways, and cover points that bank the board and re-freeze the ice.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/slide-to-safety
tags:
  - game
  - puzzle
  - pathfinding
  - ice-slide
timestamp: 2026-08-03
---

# Slide to Safety

Press anywhere on the ice and the aim opens: all four legal routes ghost in, the
one you drag toward draws itself in full — every cell, every coin, the thin ice it
deepens and a marker on the cell it will stop in. **Release commits it**, and
nothing else does. The shield then glides until a rock, the shore, a cover point
or the family tile stops it.

Five handcrafted boards on a 7 x 9 grid, one 120-second clock and three retries
for the whole run. Coins are swept up on the way past; the family tile ends the
board.

The commitment point is deliberately impossible to miss — the route dock reads
`READY` -> `AIMING` -> `COMMITTED`, the route goes ghost -> solid -> a trail the
shield eats, and a ring closes on the shield the instant your thumb lifts.

## Financial hook

The shield is the cover and the lake is a life you cannot see the bottom of.

- **Thin ice is the risk you got away with once.** Crossing a crack at speed is
  safe on the first pass and the fracture visibly deepens behind you. Cross the
  same crack again — or *stop* on any crack — and you go through. That is the
  whole argument for cover in one mechanic: the near miss does not reset, it
  accumulates, and the second one is the one that costs you.
- **You get three retries for five boards.** Not per board — for the run. Second
  chances are finite and they are spent, not earned.
- **Cover points are the argument made mechanical.** Spend a move to land on one
  and three things happen at once: it becomes your respawn cell, so the next fall
  costs a retry instead of the whole board; every fracture you have already spent
  re-freezes, re-opening corridors you had burned; and it pays 60. Boards 4 and 5
  measurably drop from par 11 to 10 and 13 to 12 with their cover points removed —
  the boards are built around them.
- **The gust is the thing you did not plan for.** It is telegraphed (a shimmer
  patrols the lane) and it is deterministic, so it is not bad luck — it is a
  known hazard you either route around or, on boards 3 and 5, deliberately ride.
  Both of those boards are measurably **unreachable** with the gust removed.
- **Par rewards planning, not speed.** Finishing a board in par pays +75 on top
  of the +100, and the par bonus is judged on the board's cumulative move count
  across retries — so drowning on purpose to reset a botched route costs the
  bonus as well as the retry.

## Boards

| # | Name | New mechanic | Par | Coins | Thin ice | Gust | Cover |
|---|---|---|---|---|---|---|---|
| 1 | First Steps | the verb | 6 | 4 | — | — | — |
| 2 | Thin Ice | thin ice | 8 | 4 | 8 | — | — |
| 3 | Crosswind | gust lane | 9 | 4 | 9 | 4 cells, row 2, pushes left | — |
| 4 | Cover Point | cover point | 11 | 5 | 10 | — | 1 |
| 5 | Bring Them Home | — (all three) | 13 | 5 | 11 | 4 cells, row 8, pushes left | 2 |

Board 1 is deliberately hazard-free and every one of its four coins sits on the
optimal line: the teaching board rewards the obvious route rather than testing
it. No board introduces two new mechanics at once and the finale carries all of
them — both gated.

Boards are ASCII maps in `src/levels.js` with a documented legend
(`.` ice, `#` rock, `S` start, `F` family, `P` cover point, `C` coin,
`X` thin ice, `^ v < >` gust cells).

## Shape of the build

- `src/levels.js` — the five ASCII boards, the legend, the gust rules and the
  parser. Pure: no DOM, no React, no kit imports.
- `src/slide.js` — the rules and the motion. `resolveSlide()` is a *query* that
  walks one swipe and returns the whole path (cells crossed, coins picked up, thin
  ice deepened or broken, the cover point reached, where it stopped) without
  mutating anything — the canvas calls it on every pointer move to draw the
  preview, so it must be free of side effects. `createGlide()` / `advanceGlide()`
  are the *motion*: they sample that path over time with the shipped speed curve,
  and both the renderer and the anti-tunnelling gate drive them, so what the
  player sees and what the gate proves are the same function. `applySlide()` is
  the *commit*, and the only thing that changes the board. All pure.
- `src/data.js` — `GAME_CONFIG` and `COLORS`: the clock, the retries, scoring,
  the timing model (which is a balance constant, not a presentation detail — the
  sim bills the bot with exactly these numbers), the bot model and every effect
  count.
- `src/SlideToSafetyGame.jsx` — presentation only: geometry, painting, juice and
  the run's state machine (`intro → idle → sliding → falling/clear → …`). All
  mutable state in refs, HUD through `textContent` refs, the ice field and rocks
  pre-rendered to one offscreen bitmap per board/resize.
- `src/Screens.jsx` — Home (a miniature of the real board plus the three-chip
  feature card), How to Play (a 5.6 s loop that replays the real control cycle —
  thumb down, preview draws, thumb lifts, shield moves — three times, plus the
  `READY -> AIMING -> COMMITTED` strip), Results (score ring against a perfect
  run, boards/cover/coins/moves tiles, Book a Slot / Retry / Home).
- `scripts/balance.mjs` — the solvability proof and balance gate; not bundled.

## Colour grammar

Blue is the player: the shield token and its glow — protection is the thing you
move. Ice-blue is cover, so a safe zone never competes with the destination.
Green is the family tile, the only safe destination, and it is the only green on
the board. Gold is wealth (the coins). Rust-red is thin ice, the only thing that
can end a run. Orange is the player's own hand: the aim, the route preview, the
commit ring and the dock's state chip. Slate is inert rock. Pale blue-white is
the ice itself.

## Solvability and balance

`node scripts/balance.mjs` imports the shipping modules and never re-implements a
rule. Per board it asserts:

1. the family tile is reachable;
2. the `par` field equals the BFS optimum over the slide graph;
3. every coin and every cover point lies on a route of length ≤ par + 2;
4. **no reachable state is a dead end** — the search enumerates every state the
   player can legally reach, *including every way they can deepen thin ice and
   every re-freeze a cover point grants*, and proves the family tile is still
   reachable from each without drowning;
5. **the cover points and gust lanes are load-bearing** — flattening either to
   plain ice must change the optimum or remove the route entirely;
6. **the difficulty ramp**, structurally and behaviourally;
7. **no tunnelling** — every slide out of every reachable state, swept at
   120/60/30/15 Hz and again at 4x slide speed, enters exactly the resolved path
   cells in order and never touches a rock or leaves the board.

Measured (all five boards, gate PASS):

| board | BFS optimum = par | coins (min moves to a route collecting it) | reachable states | dead ends | cover flattened |
|---|---|---|---|---|---|
| First Steps | 6 | 6, 6, 6, 6 (budget 8) | 24 | 0 | — |
| Thin Ice | 8 | 8, 8, 8, 8 (budget 10) | 9 | 0 | — |
| Crosswind | 9 | 9, 9, 9, 9 (budget 11) | 10 | 0 | — |
| Cover Point | 11 | 11 x 5 (budget 13) | 13 | 0 | par 10 |
| Bring Them Home | 13 | 13 x 5 (budget 15) | 22 | 0 | par 12 |

Every coin is on an optimal line, so a perfect run is 47 moves and 1,605 points.

Anti-tunnelling, measured: **1,600 slides swept, 19,757 sub-steps, 0 cells
skipped, 0 out of order, 0 rock penetrations, 0 off-path.** Worst-case unchecked
travel at 15 Hz and 4x speed is 3.90 cells per frame and the measured maximum
swept step is 3.745 cells — a naive per-frame point test would have missed up to
three whole cells; the resolve-then-follow model misses none.

Bot gate: the optimal line with 15 % wrong-swipe noise (a mis-swipe is drawn
uniformly from the directions that are *not* on an optimal line — a thumb that
flicked the wrong way, not a random walk), reaction 0.42 s ± 0.12 s gaussian.

| seeded runs | skilled bot | random-input bot |
|---|---|---|
| 300 (default seed) | 48.7 % | 0.0 % (500 runs) |
| 1,000 x seeds 12345 / 999 / 0x511de5a1 / 77777 | 50.5 / 50.7 / 49.4 / 47.7 % | 0.0 % on all four |

Target band 30–60 % skilled, under 5 % random. A losing run always dies on
retries (3.0 falls per run against 3 allowed), never on the clock: a bot that
already knows the optimal line spends 49 s of the 120 s. The clock is the *human*
constraint — a player who has to find each line, rather than replay it, is the one
who runs out of time.

Behavioural ramp, measured falls per board attempt: 0.00 / 0.69 / 0.97 / 0.88 /
0.91. Board 4 is *safer per attempt* than board 3 despite being two moves longer,
because the cover point on it banks and re-freezes — which is the mechanic
working, and why the gate asserts "the back half is harder than the front"
(0.89 vs 0.36) rather than "each board is deadlier than the last".

## Ports and commands

Dev server on **5063**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs --runs 2000`.
