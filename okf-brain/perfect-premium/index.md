---
type: project
title: Perfect Premium
description: Stop-the-marker precision timing across a twelve-stage life timeline from age 25 to 60, where the safe zone narrows from 24% to 9% of the bar, the sweep speeds up 7% a stage, and three grace periods are the only thing that makes finishing possible.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/perfect-premium
tags:
  - game
  - timing
  - precision
  - arcade
timestamp: 2026-07-28
---

# Perfect Premium

One-thumb precision timing. A marker sweeps back and forth across a bar; a single
tap locks it. Green band = that year's premium is paid and the stage clears; the
gold sliver at the centre of green = PERFECT, worth double and worth a combo
step; anywhere else = one of three grace periods gone and the stage repeats.
Twelve premiums from age 25 to the vesting date at 60, inside a 100-second cap.

Theme copy: *"Pay every premium right on time from 25 to 60 — discipline today is
a pension tomorrow."*

## Financial hook

Premium discipline and the grace period. The mechanic *is* the argument that a
policy is a 35-year habit rather than a purchase:

- **The window narrows with age.** Green runs 24% → 9% of the bar and the sweep
  compounds +7% a stage, so the tap that was comfortable at 25 is a commitment at
  55. Life gets busier; the discipline has to get sharper.
- **Every due date is named after the thing that wants the money instead** —
  first job raise, wedding year, home loan, school fees, parents' care, business
  dream. The premium is never convenient, and it gets paid anyway.
- **Three grace periods, then the policy lapses.** A real policy forgives a late
  premium up to a point; a fourth miss ends the run and everything paid so far
  counts for nothing toward the vesting date.
- **A missed premium comes back harder, not easier.** The stage repeats with a
  freshly randomised zone at the *same* narrower width and the same faster sweep.
- **The top-up band is the honest trap.** A narrow gold band offset from green
  banks +150 but does not pay the premium — the stage stays open and the speed
  bonus keeps draining. Measured, the bot that chases top-ups wins 7.8% of runs
  against 39.4% for the bot that simply pays the premium: chasing extra return
  before covering the basics is a losing strategy, with a number on it.
- **Perfection compounds; adequacy does not.** Consecutive PERFECTs stack a
  multiplier to x4, and an ordinary on-time payment keeps the policy alive but
  resets the streak. The ceiling belongs to people who are exact every year.

## Stage table

| # | age | life event | green | gold | sweep | bar |
|---|---|---|---|---|---|---|
| 1 | 25 | first pay cheque | 24.0% | 6.2% | 0.90 | straight |
| 2 | 28 | first job raise | 22.6% | 5.9% | 0.96 | straight |
| 3 | 30 | wedding year | 21.3% | 5.5% | 1.03 | straight |
| 4 | 32 | first child | 19.9% | 5.2% | 1.10 | arc |
| 5 | 35 | home loan | 18.5% | 4.8% | 1.18 | straight |
| 6 | 38 | car upgrade | 17.2% | 4.5% | 1.26 | straight |
| 7 | 41 | school fees | 15.8% | 4.1% | 1.35 | straight |
| 8 | 44 | parents' care | 14.5% | 3.8% | 1.45 | arc |
| 9 | 47 | college fund | 13.1% | 3.4% | 1.55 | straight |
| 10 | 51 | business dream | 11.7% | 3.0% | 1.65 | straight |
| 11 | 55 | pre-retirement top-up | 10.4% | 2.7% | 1.77 | straight |
| 12 | 60 | retirement day | 9.0% | 2.3% | 1.89 | arc |

Widths are fractions of the bar, sweep is bar-widths per second. Every 4th stage
the bar bends into a circular arc — different geometry to read, identical timing
rule, which is why `isArcStage()` lives in the rules module and not in the
renderer.

## Scoring

`stage = (100 + round(remaining stage seconds) x 10) x min(1 + consecutive
PERFECTs, 4)`, doubled on a PERFECT. Each attempt carries a 6-second speed-bonus
allowance drawn as a draining meter. The bonus top-up band is a flat +150 that
does not clear the stage and does not touch the combo. A miss resets the combo
and burns a grace period.

Stats contract: `{ score, perfects, bestCombo, stagesCleared }`.

## Shape of the build

- `src/data.js` — `COLORS`, `STAGES` (twelve ages and life events) and
  `GAME_CONFIG`: sweep ramp, zone ramp, gold fraction, top-up band, scoring
  weights, grace count, 100 s clock, pacing beats, every effect count. Zero
  imports, zero browser API.
- `src/stages.js` — **every rule**, as pure functions: difficulty ramp, zone
  generation, lock judgment, sweep kinematics, scoring, and the complete run
  state machine (`createRun` / `runStep` / `runTap` / `lockAt` / `runStats`).
  No DOM, no React, no canvas. The component drives it and the balance simulator
  drives it, which is what makes the gate measure the shipping game.
- `src/PerfectPremiumGame.jsx` — presentation only: canvas layout, offscreen
  pre-render, programmatic painters, particles, audio, HUD. Mutable state in refs.
- `src/Screens.jsx` — Home (the timeline, bar and sweeping marker as inline SVG),
  How to Play (3-beat CSS-animated SVG), Results (a ring filled by premiums paid,
  with the stats-contract tiles).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Colour grammar

Green is "premium paid on time" — the safe zone, the cleared milestone nodes, the
results ring. Gold is the reward tier: the PERFECT sliver and the bonus top-up
band. Orange is the player's own hand — the sweeping marker and the milestone
that is due right now. Red only ever means a grace period being burned. Blue is
the timeline itself, the policy years stretching from 25 to 60.

## Balance

`scripts/balance.mjs` imports `src/stages.js` and `src/data.js` and drives them
with a bot whose realised lock is `green centre + N(0, sigma)`, clamped to the
bar. Timing is simulated, not assumed: after a 0.22 s beat to read a fresh
layout the bot waits for the marker to actually reach its target and locks there,
so resolve beats and wasted sweeps come out of the same 100-second clock the
player gets. Two mulberry32 streams per run (game zones, bot noise), both a pure
function of the run index and the master seed; gaussians via Box-Muller.

Gate: sigma 6% in 25–45%, sigma 2% at or above 90%, every run terminates inside
the clock, and the timeout lose path must be demonstrably reachable.

Measured, 20,000 runs per profile, seed `0x5eed1234`:

| profile | win% | lose: grace | lose: clock | mean score | premiums | perfects | clock |
|---|---|---|---|---|---|---|---|
| sigma 2% (expert) | 100.0% | 0.0% | 0.0% | 7,444 | 12.00 | 8.34 | 13.9 s |
| sigma 4% | 88.7% | 11.3% | 0.0% | 4,118 | 11.81 | 5.11 | 15.1 s |
| **sigma 6% (casual)** | **39.4%** | 60.6% | 0.0% | 2,884 | 10.18 | 3.55 | 15.3 s |
| sigma 8% | 10.4% | 89.6% | 0.0% | 2,028 | 7.80 | 2.47 | 13.5 s |
| sigma 12% (mashing) | 0.5% | 99.5% | 0.0% | 1,090 | 4.56 | 1.33 | 10.1 s |
| sigma 6% greedy | 7.8% | 92.2% | 0.0% | 2,073 | 7.24 | 2.56 | 13.7 s |
| dithering (2%, 7.2 s) | 90.4% | 0.0% | 9.6% | 4,845 | 11.90 | 8.30 | 98.1 s |

At the default 500-run gate the same seed measures casual 42.4% / expert 100.0%;
across five other master seeds casual measured 35.8–42.4%, so the gate sits well
inside the band and is not seed-fragile.

The curve is steep exactly where a skill test wants it — halving aiming error
from 6% to 3% moves the win rate from 39% to 99%, doubling it to 12% moves it to
0.5%:

```
sigma   1.0%   2.0%   3.0%   4.0%   5.0%   6.0%   7.0%   8.0%  10.0%  12.0%
win%   100.0  100.0   99.0   88.7   64.8   39.4   21.1   10.4    2.3    0.5
```

With gaussian error the per-stage clear chance is `erf((green/2)/(sigma*sqrt2))`,
running 95.4% on stage 1 to 54.7% on stage 12; zero misses across all twelve is
only 5.7% likely. **The three grace periods are what turn 5.7% into 39%** — they
are the mechanism that makes the run winnable at all, which is exactly the point
the game is making about real policies.

No spec constant needed correcting: everything in design spec §10 shipped as
written and hit both targets on the first measurement. See `log.md`.

## Ports and commands

Dev server on **5064**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance`,
`node scripts/balance.mjs --runs 20000 --sweep`.
