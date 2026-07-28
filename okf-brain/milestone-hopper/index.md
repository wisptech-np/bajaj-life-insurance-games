---
type: project
title: Milestone Hopper
description: Crossy-Road-style lane hopper where a guardian crosses 48 rows of life stages, dodging risk traffic and riding coverage platforms to reach Retirement.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/milestone-hopper
tags:
  - game
  - lane-hop
  - arcade
timestamp: 2026-07-28
---

# Milestone Hopper

One-thumb lane hopper. Tap to hop forward a row, swipe to steer. Cross a fixed
48-row course of pavement, risk roads and uncertainty rivers to reach the
Retirement row inside a 120-second session, staying ahead of a risk tide that
climbs the course from behind.

## Financial hook

The course is a working life laid out one row at a time. Pavement rows are the
stretches where nothing is coming at you; roads are the years risk streams
across; and past Marriage the ground opens into uncertainty rivers crossable only
by standing on cover — the glowing platforms drifting through the fog. Six
milestones mark the run: Graduation (row 8), First Job (16), Marriage (24), Home
(32), Child (40), Retirement (48). The risk tide is why standing still is not a
strategy, and cover tokens are cover in the literal sense: a virus spends the
token instead of the run.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here.
- `src/MilestoneHopperGame.jsx` — the whole game: one canvas component with
  mutable state in refs, module-level course generation, offscreen sprite
  builders and programmatic draw functions.
- `src/Screens.jsx` — Home (the course itself as a receding stack of flat-shaded
  slabs), How to Play (3-beat CSS-animated SVG: tap hop, dodge virus, milestone
  banner), Results (score ring, rows/coins/milestone tiles, milestone chips, Book
  a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`: fixed-step loop with the session
  clock, pointer input, pooled particle/shake/float-text effects, Web Audio synth,
  device tiering. Never edited in place.

## Colour grammar

Green is always risk (viruses, rivers, the tide), blue is always protection
(pavement, coverage platforms, the guardian, cover tokens), gold is wealth
(coins) and the milestone rules. That is why safe rows are blue-slate pavement
rather than the usual green grass — grass would put the safest thing on screen in
the exact colour of the deadliest.

## Course generation

Seeded `mulberry32(Date.now()-ish)` at mount, so replays differ. Lane types are
chosen first (safe share lerps 42% down to 26% across six 8-row segments, rivers
take 25% of non-safe rows past row 24), then rewritten by two structural rules:
the row either side of a river is forced safe, and a road run is capped at three.
Safe-row planters are re-rolled against the previous row's standable set — one
linear flood fill per row — so a row whose open cells are all unreachable is
regenerated, and cleared outright if six attempts fail.

## Balance corrections

Four readings differ from the spec's literal values, each verified against a
headless simulation of the exact update order across 200 generated courses (see
the game README's "Balance notes"):

1. Lane spacing is authored in **seconds of standing room** (`roads.gapSeconds`,
   1.8 s down to 1.2 s) rather than cells. `minGapCells: 2.2` alone is a 0.28 s
   window at 220 px/s; at 0.7 s the simulated casual player still won only 13% of
   runs, at 1.8-1.2 s they win 33%.
2. The virus wrap cycle is decoupled from the screen width, so a fast lane can be
   genuinely sparse without showing two copies of the same blob.
3. `rows.maxRoadRun: 3` — long road runs with no bank to read from were the
   dominant cause of death.
4. `pickups.shieldInvulnSeconds: 1.0` — without it the token absorbs the hit and
   the next frame kills you anyway.

Measured with the shipped values: casual play wins 33% of runs, reaching row 48
in 13.6-27.6 s; the tide needs 124.8 s to climb the whole course so it can only
catch a player who stops (40% of runs for a player who idles at row 10, 1.5% for
one who keeps moving); worst-case standing room per segment is 1.80 / 1.68 / 1.56
/ 1.44 / 1.32 / 1.20 s; and no row in 9,600 generated rows was unreachable.

## Ports and commands

Dev server on **5038**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`.
