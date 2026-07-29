---
type: project
title: Premium Pinball
description: Portrait single-screen pinball with a hold-to-charge plunger and real rotating-capsule flippers, where the three goal bumpers are Education, Home and Retirement and the drain between the flippers is a lapsed premium.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/premium-pinball
tags:
  - game
  - pinball
  - physics
  - flippers
  - arcade
timestamp: 2026-07-29
---

# Premium Pinball

Portrait pinball on a fixed 400x640 table. Hold anywhere to charge the plunger,
release to launch the ball up the right-hand lane and round the top arc, then tap
or hold the left and right halves of the screen to work the flippers. Three balls
and a 120-second clock; win at 3,000 points.

Dev port **5055**. CRM identity `premiumPinballLeadNo` / `Premium Pinball Lead`.

## Financial hook

The ball is the cover and the drain is a lapsed premium — the table is labelled
LAPSE where it opens between the flipper tips. Everything worth scoring is a
family goal:

- **Education / Home / Retirement** are the three goal bumpers. Hitting all
  three on a single ball pays 500 on top of the individual hits: fund every
  goal, not just the one nearest the flipper.
- Three **rollover lanes** across the top arm **Bonus Secure** — 2x everything
  for 8 seconds. The lanes cannot be brute-forced from below (only a downward
  crossing lights one), so arming the bonus means committing plunge power to
  reaching the far lane rather than farming the near one. Cover every lane and
  the whole table pays double: the compounding argument, in arcade form.
- Slingshots pay 25 and mostly exist to keep the ball off the flippers — the
  small stuff that keeps a plan alive between the big contributions.

## Controls

| Input | Action |
| --- | --- |
| Hold anywhere while the ball is in the lane | Charge the plunger |
| Release | Launch. Power picks the orbit depth, so it picks the rollover lane |
| Tap / hold left half | Left flipper — holding keeps it raised |
| Tap / hold right half | Right flipper |
| Holding a flipper up | Legal, and measured by the balance gate. Not free: a held flipper lets balls coming down that side roll past into the outlane |

**Cover Note (ball save).** A drain inside the first 9 seconds of a ball is
re-served free, once per ball. It exists because this table's outlanes are
undefendable by construction — the same geometry that stops a held flipper
roofing the drain — and because it lifts the median session from 27 s to 46 s.
Thematically: the grace period on a late premium.
| Two fingers | Both flippers at once |
| Arrow keys, A / D, Space | Desktop equivalents |

Multi-touch is handled by a dedicated pointer map in the component rather than
`kit/input.js`, which ignores secondary touches by design. Everything else —
loop, effects, audio, device tiering — comes from the kit unmodified.

## Scoring

| Event | Points |
| --- | --- |
| Goal bumper | 50 |
| Rollover lane, first time lit | 75 |
| Slingshot | 25 |
| All three goal bumpers on one ball | 500 |
| Bonus Secure | the above x2 for 8s |

Win: 3,000 before three drains or the 120s clock. Combo = the longest chain of
scoring contacts inside 1.5s of each other.

Stats contract: `{score, bumpers, goalsLit, combo}`. `goalsLit` counts distinct
goal bumpers lit per ball and accumulates across the run, so it tops out at 9.

## Architecture

Rules are pure and shared with the balance gate:

| File | Contents | Touches DOM |
| --- | --- | --- |
| `src/data.js` | all tunables: geometry, physics, scoring, fx | no |
| `src/table.js` | segments / circles / flipper defs built from the tunables | no |
| `src/physics.js` | substepped collision solver, rotating-capsule flipper | no |
| `src/engine.js` | phases, scoring, bonus, balls, win/lose | no |
| `src/render.js` | every canvas painter | `createElement('canvas')` only |
| `src/PremiumPinballGame.jsx` | canvas shell, input, juice, HUD | yes |

The table is authored at a fixed logical 400x640 and letterboxed, not scaled to
the viewport. A pinball table whose drain mouth grew with the screen would be a
different game on every handset, and the balance numbers would mean nothing.

## Physics

- Gravity `BALANCE.physics.gravity x 0.55` = 880 px/s^2 (table pitch).
- Restitution 0.55 walls, 1.15 bumpers, 0.98 slingshot faces, 0.34 flippers —
  the flipper's punch comes from its angular velocity, not its bounciness.
- Speed clamped to 1500 px/s after every impulse (the energy-inject clamp). Free
  fall down the whole table only reaches ~1030 px/s, so the clamp only ever bites
  on a bumper or flipper hit.
- Each 1/120 s tick is split so no substep moves the ball more than 3.2 px. At
  the speed ceiling that is exactly 4 substeps; 3.125 px of travel against a 9 px
  ball radius leaves no way through a zero-thickness segment.
- Coulomb friction (tangential impulse capped at 0.12 x the normal impulse), not
  a per-contact velocity retention factor — see the log for why that distinction
  decided whether the game worked at all.
- A settle wobble: a slow alternating horizontal micro-acceleration applied only
  to a nearly-stopped ball. Exact Coulomb friction on a perfectly level table
  holds a ball on any slope shallower than atan(mu) = 6.8 degrees, including the
  top of a flipper's pivot cap. Real cabinets break that with vibration and lean;
  this is the same idea, and it alternates so it can never bias play.
- Trap-freedom is an ASSERTED INVARIANT, not a claim: `minWallFlipperClearance()`
  in table.js measures every wall against the flipper axis across the entire
  sweep, and the gate fails below 2 x ball radius + flipper radius (26 px).
- Flippers are capsules rotating about a pivot at 17.5 rad/s over 1.04 rad
  (~60 ms). The contact solver works in the flipper's moving frame and hands the
  frame's velocity back to the ball; that transfer is the flip.

## Balance

`node scripts/balance.mjs` — 200 seeded runs **per hold profile**, base seed
`0x5eed1055`, run *n* uses `base + n * 0x9e3779b9 (mod 2^32)`. The bot flips
whenever the ball enters a flip window, with an 80 ms +/- 80 ms gaussian
reaction resampled into (0, 300 ms] and a 200 ms rearm, and plunges at a uniform
random power.

The gate runs three FLIPPER-HOLD profiles, because a held flipper is a different
table: it changes the collision geometry of the whole lower playfield for as
long as it is up, and a gate that measures only tapping proves only that tapping
works.

Every profile runs over **four seed blocks**
(`0x5eed1055, 0xdeadbeef, 0xb52a7998, 0x1234abcd`), because "zero watchdog
drains" measured on one seed is a statement about that seed. Watchdogs are
reported per block and any non-zero block fails the gate.

| Profile | Band | Win rate | Watchdog drains |
| --- | --- | --- | --- |
| tap (110 ms) | 20–45% | **36.7%** (220/600) | **0** (0/0/0/0 by block) |
| cradle (800 ms) | 5–60% | **32.8%** (197/600) | **0** (0/0/0/0) |
| cradle (3 s) | 5–60% | **30.7%** (184/600) | **0** (0/0/0/0) |

Session length, tap profile: mean **45.9 s**, p10 36.6, p25 40.9, **p50 46.0**,
p75 51.1, p90 55.6; only **0.2%** of sessions end inside 20 s. Cover Note saves
average 2.07 per run.

| Measure | Gate | Measured |
| --- | --- | --- |
| Wall-vs-flipper clearance, full sweep | > 26 px | **29.98 px** |
| Tunnelling events | 0 | **0** |
| Peak ball speed | <= 1500 px/s | **1500.0** (clamp active) |
| Collision substeps | >= 4 | **min 4**, mean 4.00 over 1.67 M ticks |

Difficulty degrades smoothly along the hold axis rather than collapsing (600 runs
per row): 60 ms 37.5%, 110 ms 36.7%, 200 ms 34.8%, 400 ms 34.2%, 800 ms 32.8%,
1.5 s 33.8%, 3 s 30.7%, 6 s 23.3% — zero watchdog drains at every point. Camping
is punished by the outlanes, not by a bug. Tap median score 2,475 against a
3,000 target; 14.0 bumper hits, 6.6 of 9 goals lit, 1.02 Bonus Secure arms.

`node scripts/render-smoke.mjs` — a second gate that runs every canvas painter
under Node against a recording stub context, at three device profiles and six
real mid-run engine states. `pnpm build` only proves the JSX compiles; the smoke
test is what proves the painters actually call real canvas methods with finite
geometry.

## Verification

```
pnpm install
pnpm balance   # bot win rate / tunnelling / speed / substeps
pnpm smoke     # canvas painters on real engine state
pnpm build     # the hard gate
pnpm verify    # all three
```
