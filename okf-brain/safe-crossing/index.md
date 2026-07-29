---
type: project
title: Safe Crossing
description: Top-down traffic-control game on a 4-way junction — tap a vehicle to brake-hold it, tap again to release, and route 20 family vehicles through a shared centre box that unstoppable risk trucks barrel straight across, with one Claim Cushion covering the first collision.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/safe-crossing
tags:
  - game
  - traffic
  - timing
  - arcade
timestamp: 2026-07-29
---

# Safe Crossing

You are the junction. A 4-way crossing, one lane per direction, fixed straight
paths through a shared centre box. Family vehicles arrive on all four approaches
and nothing waits unless you make it wait: **TAP** a vehicle to put it on the
brakes, **TAP again** to send it. Two vehicles overlapping inside the box is a
collision — the first is absorbed by your single **Claim Cushion**, the second
closes the junction. Twenty vehicles through inside 110 seconds wins the shift.

## Financial hook

The junction is a household's month. Everything arrives at once, most of it can
be sequenced if you pay attention, and exactly one thing on the road cannot be
negotiated with.

- **Risk trucks have no brakes.** They are 10% of traffic, they announce
  themselves with a horn and a flashing beacon, and tapping one does nothing at
  all. The only play is to move everybody else. That is risk: not something you
  argue with, something you plan around.
- **One Claim Cushion, and only one.** The first collision costs nothing but a
  blue shield flash. The second ends the run. Cover does not make you immortal;
  it buys you the one mistake you were always going to make.
- **You cannot hold traffic forever.** Every driver has six seconds of patience
  for the whole run — the ring around a held vehicle drains while it waits and
  never refills — and once it is gone they go and will not stop for you again.
  Freezing a lane to make the junction safe is not a strategy, it is a deferred
  problem, and it comes back with a queue behind it.
- **Smart timing pays.** Threading two vehicles past each other inside 24 px
  without contact is worth +30. Planning beats stopping.

## Rules

| | |
|---|---|
| Session | 110 s |
| Win | 20 vehicles clear of the box |
| Lose | second collision, or the clock with fewer than 20 through |
| Scoring | through **50**; non-contact pass inside 24 px **+30** |
| Traffic | one vehicle every 2.4 s ramping to 1.4 s across the four approaches |
| Patience | 6 s per driver, cumulative across the run, never refunded |
| Vehicles | scooter 30% / family car 42% / school van 18% / **risk truck 10% (no brakes)** |
| Stats contract | `{ score, crossed, nearMisses, crashes }` |

## Geometry

Lanes keep **left** (Indian traffic): travelling south your left is screen-right,
so the southbound lane sits right of the centre line; travelling east your left
is screen-down, so the eastbound lane sits below it. Parallel lanes are a full
lane apart and can never touch, which puts exactly **four conflict points** at
the corners of the inner square — N|S × E|W. Every collision in the game happens
at one of those four spots, which is what makes the board readable at a glance.

Each approach has an off-canvas **runway**: the visible stretch of road is only
the last ~4 seconds, and four to six vehicles are queued behind it. Same-lane
traffic never rear-ends — it queues — so the only collision in the game is a
junction overlap.

## Shape of the build

- `src/traffic.js` — **all the rules and nothing else.** Junction geometry, the
  spawn schedule and its dispatcher, vehicle kinematics and car-following,
  brake/release, junction-overlap collision, near-miss detection, scoring. No
  React, no DOM, no canvas, no colours, no imports. `scripts/balance.mjs`
  imports this module directly, so the balance table is measured against the
  code that ships rather than a re-implementation of it.
- `src/SafeCrossingGame.jsx` — pixels, sound and HUD. Decides nothing about the
  game. Mutable state in refs, road art pre-rendered per resize, HUD numbers
  written through `textContent`, no allocation in the hot loop.
- `src/data.js` — `GAME_CONFIG` and `COLORS`: every tunable plus the measured
  balance table and the reasoning behind each difficulty knob.
- `src/Screens.jsx` — Home (the junction itself in inline SVG, a car braking
  while a truck runs the box), How to Play (three CSS-animated SVG beats),
  Results (score ring, through/close-calls/collisions tiles, Book a Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Colour grammar

Orange is risk and only risk: the truck, the contested-conflict rings, the
low-time clock. Blue is protection — the Claim Cushion badge, the shield ring
that blooms out of a covered collision, the family car. Green means "you are
winning": a vehicle clearing the box, the progress bar, the release puff. Red
means stop or damage — brake lights, hold rings, collisions. Nothing that helps
you is ever red, and nothing that hurts you is ever blue.

## Balance

`node scripts/balance.mjs --runs 400` (seed `0x5afec205`) drives the shipping
rules headless and enforces three gates at three canvas sizes — the brief's two,
plus one the game needs:

1. the brief's bot — 3 scans/s, holds the later-arriving vehicle of every
   predicted junction overlap, 300 ms reaction — wins **25–45 %**;
2. a do-nothing bot **crashes out in under 15 s**;
3. `park-N/S`, which plays the game's one degenerate idea (keep the leading
   northbound and southbound vehicle held, so no conflict pair can exist) and
   nothing else, does not beat the reaction bot by more than **10 points**.

Every bot may only act on vehicles that are **on canvas**: half of each approach
runway is off screen, and a bot braking what the player cannot yet see is not
playing the same game.

| canvas | reaction bot | truck-aware | park-N/S | do-nothing (2nd crash) |
|---|---|---|---|---|
| 407×612 | 34.3 % | 52.8 % | 5.0 % | 6.3 s |
| 407×556 | 38.5 % | 57.5 % | 5.0 % | 5.4 s |
| 338×452 | 32.5 % | 51.5 % | 4.8 % | 5.5 s |

Stable across seeds: over 3 seeds × 3 sizes the reaction bot spans 32.0–38.5 %
and park-N/S 4.3–7.2 %.

The truck-aware line is the same bot plus the one thing the literal brief bot
never learns: when the later-arriving vehicle is a risk truck, hold the *other*
one. The ~18-point spread between the two lines is the risk-truck mechanic
measured in win rate, and it is the skill headroom a human has above the gate.
Truck-versus-truck pairings — the only genuinely unavoidable collision against a
single Claim Cushion — are 0.3–1.2 % of all crashes, because the dispatcher
actively refuses to create them.

Reaction bot per run: 1.5 collisions, 6.4 close calls, ~21 vehicles dispatched,
~33 s (a winning run ~38 s). Crash distribution 11 % / 23 % / 66 % for zero, one
and two collisions — so the Claim Cushion is used in ~89 % of runs and is the
single most-felt object in the game.

## Ports and commands

Dev server on **5062**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`
(`node scripts/balance.mjs --runs 400 --sweep`).
