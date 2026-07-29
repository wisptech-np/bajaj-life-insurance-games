---
type: project
title: Steady Wings
description: One-tap impulse flight — a shield-glider threads 24 labelled expense walls inside 100s, the slot narrowing 34% to 24% of the sky, with a blue cover token every ~8 gates that absorbs exactly one collision.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/steady-wings
tags:
  - game
  - flappy
  - one-tap
  - arcade
timestamp: 2026-07-29
---

# Steady Wings

A shield-glider — the family's cover, in flight — scrolls right at a fixed speed
while gravity pulls it down. **One tap sets its vertical velocity to a single
fixed lift**, and that is the whole control scheme. Paired stone pillars scroll in
from the right, each pair labelled with a household expense (School fees, Medical
bill, EMI hike, Gadget splurge, Rent due, Car service, Festival spend, Tuition
fees); the slot between them is a premium kept on time. Clear **24 gates inside
100 s** to win; a pillar with no cover, the floor, the ceiling or the clock ends
it. Dev port **5065**.

## Financial hook

The mechanic is the argument, and the balance sim measures it rather than
asserting it:

- **The bills arrive on a schedule you do not control.** The scroll never stops
  and never slows; the only variable is whether you are in position when the next
  wall reaches you. Nothing in the game lets you pause the bills.
- **They get harder, not easier.** The slot narrows from 34% to 24% of the sky
  while the scroll speeds up 12% twice, so the same standard of flying that
  cleared gate 3 does not clear gate 21. Measured: the honest pilot's per-gate
  death rate is flat-ish at 2–4% precisely *because* the ramp is fighting an
  improving position, and 552 of 1,600 runs finish.
- **Doing nothing is the fastest way down.** The `idle` bot never taps and is on
  the floor in 0.68 s. There is no neutral position in this game, which is the
  point: not deciding is a decision.
- **Panic is not a strategy either.** The `spam` bot taps at the cooldown limit
  and is dead on the ceiling in 1.38 s. Over-correcting kills you as reliably as
  under-correcting.
- **Cover does not raise your ceiling — it stops one bad moment from being
  final.** The blue token appears before gates 4, 12 and 20, absorbs exactly one
  collision, shatters, and shoves you clear of the pillar you hit. It never makes
  you a better pilot. In the gate profile, 1,715 tokens were taken and 1,012 were
  spent: cover was the difference between a run continuing and a run ending 1,012
  times out of 1,600.
- **Holding it is worth something too.** Finishing with the shield still intact
  pays +150 — the run where you never needed the claim is the good outcome.

## Why the flight physics are what they are

The one piece of design not in the brief, and the piece the whole game turns on.

A tap **SETS** vertical velocity to `-flapVelocity` rather than adding to it, so a
pilot holding a line occupies a band exactly one *hop* tall, where

    hop   = flapVelocity² / (2·gravity)     = 0.0484 heights (~29 px at 600)
    cycle = 2·flapVelocity / gravity        = 0.440 s (~2.3 taps/second)

The slot the band has to fit inside is `gapHeight − 2·gliderRadius`, so the margin
actually being flown is `m = (gapHeight − 2·gliderRadius) − hop`, running 0.228 at
gate 1 down to **0.128** at gate 24. A tap mistimed by σ seconds displaces the
glider by roughly `σ · flapVelocity`, so 90 ms of jitter buys 0.040 heights of
error against a half-margin of 0.064 at the last gate.

That ratio is the entire difficulty curve, and `flapVelocity` is by far the
sharpest lever on it because it raises the hop *quadratically* and the error only
*linearly*. At the shipped 0.44 s cycle:

| `flapVelocity` | hop | honest pilot |
|---|---|---|
| 0.44 | 0.0484 | **34.2%** |
| 0.48 | 0.0528 | 22.5% |
| 0.52 | 0.0572 | 13.8% |

The first build shipped a Flappy-Bird-sized hop (0.094, from 0.70/2.6) and
measured **0.0%** at every jitter setting including zero. A 24-link survival chain
simply cannot carry a hop that large: needing ~33% over 24 gates means ~95.5%
per gate, and there is no room in that budget for a bob bigger than the slot's
clearance. See `log.md` for the 45-cell sweep.

## Normalised coordinates

`y` runs 0 (ceiling) to 1 (floor) and **every horizontal distance is measured in
playfield heights** — gate spacing, pillar width, the distance flown. Velocities
are heights/second, gravity heights/second². The renderer multiplies by the
measured playfield height and nothing in `flight.js` knows what a pixel is.

This is the wealth-drop lesson applied up front: its coin kept the same absolute
sideways authority while the board shrank with the screen, and the win rate moved
20 points between two handset sizes. Here a 360×640 and a 430×900 run identical
physics by construction rather than by tuning.

## Difficulty ramp

| | |
|---|---|
| Slot height | 34% → 24% of the playfield, linear across gates 1–24 |
| Scroll speed | 0.272 h/s, ×1.12 after gate 8 and again after gate 16 |
| Gate interval | 2.90 s → 2.59 s → 2.32 s (gates sit at fixed world positions, so a faster scroll shortens the interval rather than moving them) |
| Drift | From gate 12, a seeded coin flip per gate: drifting slots ride a ±0.045-height sine with a 3.1 s period |
| Full run | 64.6 s of flight over 19.28 heights of sky, against a 100 s clock — 35.4 s spare |

## Scoring

| event | value |
|---|---|
| Gate cleared | 50 |
| Coin | 25 |
| Near miss (closest approach within 0.035 heights of a pillar edge) | 30 |
| Cover still intact at the win | 150 |

Stats contract: `{score, gates, coins, nearMisses}`.

Coins are placed to reward the line you already want: one dead-centre in every
slot (riding the drift with its gate), plus a three-coin arc strung between gates
along the path from one centre to the next. Three of those arcs carry the cover
token in place of their middle coin.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`; every tunable in one place.
- `src/flight.js` — **pure**: seeded level generation, flight physics, gate
  crossing, near-miss detection, pickups, the shield absorb, scoring, win/lose,
  and the reachability envelope. No DOM, no React, no import of `data.js` (config
  is a parameter).
- `src/SteadyWingsGame.jsx` — the canvas component. Mutable state in refs,
  module-level draw functions, offscreen-prerendered sky/parallax/label bitmaps
  rebuilt only on resize. It contains no rules: it decides only what a flight
  looks like.
- `src/Screens.jsx` — Home (the game itself as inline SVG: labelled walls
  scrolling past a threading glider), How to Play (3-beat CSS-animated SVG),
  Results (score ring, gates/coins/near-miss tiles, Book a Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji
sprites: the glider is a swept vector craft of quadratic curves with a canopy and
a foreplane, pillars are gradient masonry with drawn courses and a hot lip facing
the slot, coins are radial gradients squished on a spin axis, the cover token is a
shield crest with a drawn tick, clouds and ridges are pseudo-random path fields
baked into two-screen-wide bitmaps that wrap seamlessly. The scaffold's
`guardian_shelter_bg.png` on the thank-you screen was replaced with a gradient sky
wash, so the game ships with zero binary assets.

## Colour grammar

Orange is the glider — you, the cover in flight. Blue is the sky you are keeping
it in and the shield token that saves you once. Gold is a premium kept on time:
the coins and the flash a slot gives when it is cleared. The pillars are cool
grey-blue masonry with a hot red lip at the slot edge, so the thing that actually
kills you reads as a bill rather than as scenery.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` / `flight.js` and never
re-implements a rule. Every band is asserted **independently on each of 4 seed
blocks of 400 runs** — the batch-4 lesson, where single-seed gates were rejected
in review because a band that holds on one block is a sample, not a property.

| profile | blk0 | blk1 | blk2 | blk3 | pooled | band |
|---|---|---|---|---|---|---|
| **`spec`** (honest pilot, 90 ms tap jitter + 10%-of-gap aim error) | 34.8% | 33.5% | 33.5% | 36.3% | **34.5%** | 25–45% |
| `sharp` (25 ms jitter — the skill ceiling) | 100% | 100% | 100% | 100% | 100% | ≥ 90% |
| `perfect` (no jitter — reachability, measured) | 100% | 100% | 100% | 100% | 100% | = 100% |
| `idle` (never taps) | 0% | 0% | 0% | 0% | 0% | dead in 0.68 s |
| `spam` (taps at the cooldown limit) | 0% | 0% | 0% | 0% | 0% | dead in 1.38 s, ceiling |

Block spread on the gate profile is **2.7 points**. The honest pilot averages
15.98 gates, 37.2 coins, 3.8 near misses and 1,865 points per run over 45.1 s;
its 552 winning runs average 2,831 points. Death is distributed almost evenly
across all 24 gates (2.1–3.8% of runs each), which is what a ramp fighting an
improving position looks like — not a wall at the end.

**Jitter sensitivity, printed on every run:**

    0ms 97.2% | 30ms 94.5% | 50ms 86.1% | 70ms 61.3% | 90ms 38.2% | 110ms 11.7% | 130ms 4.7%

The control law the bots use is the honest one: *tap when `y ≥ gap centre +
hop/2`*, and nothing more. No profile reads `over`, `crossMinClear` or any other
adjudication field, and none can tap faster than the 90 ms cooldown a finger is
also held to.

**Reachability** is proved three ways, because two of them are independent
conditions and the first alone is not sufficient.

*Travel* — `checkReachability()` in `flight.js` walks every leg of all 1,600
generated levels and requires the worst-case centre-to-centre move (including
both gaps' full drift swing) to fit inside the climb and descent envelopes with
0.12 heights of slack; the tightest leg observed needs **69.4%** of budget.

*Line-holding* — getting to the slot is not the same as staying in it while
crossing. A drifting slot slides at up to `driftAmp·omega`, so the band a pilot
occupies inflates from 0.0484 h to **0.0705 h** (+46%) measured in the gap's
frame. Every drifting gate must leave room for that band plus the
`2·sigma·flapVelocity` a mistimed tap costs. Asserted from the config alone (the
narrowest slot that can ever drift, at full amplitude — true for every seed that
will ever exist) and over all 10,403 drifting gates generated: **75.1% of
margin** in both. This half was added in the review fix round after the reviewer
showed that doubling the drift amplitude left the travel check passing at 82.6%
of budget while the honest pilot collapsed to 18.7%; the new assertion fails that
configuration, as it should.

*Empirical* — the `perfect` profile clears 24 gates on every seed of every block.

**Anti-tunnelling** is
likewise argued analytically on both axes (45.7 overlap tests per pillar
horizontally; 17.0 steps to cross the narrowest gap vertically, at terminal
velocity and top scroll speed) and counted empirically — a pillar passed without
a single overlap test increments `tunnels`, and the total is 0 across every
profile and block.

The gate also asserts the generator is non-degenerate (every consecutive centre
jump respects both a maximum *and* a minimum delta, so no seed can serve six
gates on one line), that no gap breaks the ceiling/floor margin at a drift
extreme, that a full run fits the clock and the 120 s build-standard cap, and
that `RESULT_TARGET_SCORE` (2,600) is under both the argued scoring ceiling
(4,395) and the best score the `sharp` profile demonstrably posted (3,180) — the
goal-keeper lesson, where a ring denominator sat above the achievable maximum and
could never close.

One correction against the brief is documented in `log.md`: the briefed flight
"feel" was not specified numerically, and the first physics choice made the
briefed 34%→24% gap ramp unwinnable. Softening the hop rather than widening the
gaps keeps **every constant the brief names exactly as specified** — 24 gates,
100 s, 34%→24%, +12% at gates 9 and 17, drift from gate 12, scoring 50/25/30/150,
token every ~8 gates — while landing the honest pilot at 34.5%.

## Ports and commands

Dev server on **5065**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs`, `node scripts/balance.mjs --blocks 8 --runs 2000`,
`node scripts/balance.mjs --sweep`.
