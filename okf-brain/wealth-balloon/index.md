---
type: project
title: Wealth Balloon
description: Goal-funding triage under a rate-limited income, with forecast shocks and a fixed-premium cover decision. Three goals inflate toward visible targets and deadlines; income funds only some of them; shocks are announced four seconds ahead with the exact money they will take, and one tap buys cover for a fixed 28. Nothing is hidden and nothing is random except which goal a shock lands on and how hard.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/wealth-balloon
tags:
  - game
  - resource-management
  - triage
  - decision-under-time-pressure
timestamp: 2026-08-03
---

# Wealth Balloon

**Concept replaced on 2026-08-03.** This was a press-your-luck inflate game —
hold a balloon, a hidden threshold decides when it pops, let go before it does.
The review found the format did not carry meaningful value, and it was right:
see `log.md` for the argument and the measurement that settled it. What ships now
is a goal-funding triage game that reuses nothing of the old mechanic except the
balloon as an object and the directory name.

Three life goals inflate side by side. Each shows its funding **target** as a
dashed ring, its **deadline** as a bar, and what it holds right now as a number.
HOLD a balloon to pour income into it; slide the thumb to switch. Income refills
at 24/s and drains at 76/s, so you can never fund all three and every second is a
choice about which one. Shocks are **forecast four seconds ahead** on a named
goal, with the exact money they will take at that goal's present value printed on
the badge. One tap buys cover for a **fixed premium of 28**, which absorbs one
shock in full and then is spent. Ninety seconds, win at 1000.

## Financial hook

**Insure what you cannot afford to lose, not what is merely likely.**

- **The premium is fixed and the exposure is not.** A shock takes 28–72% of
  whatever that goal is holding *now*, so the same 28 rupees of premium is
  obviously right against a balloon holding 180 (saves 99) and obviously wrong
  against one holding 30 (saves 16). The player does that comparison in their
  head, from two numbers already on screen, several times a session. That is the
  underwriting decision itself rather than a metaphor for it.
- **Cover costs twice.** The drain is three times the refill, so a player who
  funds flat out has no reserve and cannot buy a premium at all. Buying cover
  costs the 28 *and* the second of funding given up to have 28 in hand. Measured:
  a bot that funds without ever holding income back is uninsurable by
  construction. This is the sharpest true thing the game says about household
  finance.
- **You cannot fund everything, and spreading is worse than choosing.** Income
  over a session is ~2,300 against ~2,600 of goals. The `spread` bot — which
  funds all three equally and covers optimally — averages **107** against the
  skilled bot's **1,212**. Fair-sounding allocation funds nothing.
- **Judgement beats both extremes.** `never-cover` averages 606, `always-cover`
  944, `skilled` 1,212. Going bare costs 606; blanket cover recovers 338 of it;
  choosing which shocks to cover recovers the remaining 268.

## Rules

| element | rule |
|---|---|
| goals | 3 at once, each with a visible target and deadline |
| funding | HOLD to move income in at 76/s; slide to switch; release to stop |
| income | starts 80, refills 24/s, caps 170 |
| target | `140 + 12 x n`, ±16% jitter |
| window | 19.5 s ±10%; opening deadlines staggered 5.5 s apart |
| funded | value ≥ target at the deadline → score += target |
| missed | short at the deadline → −40 (never below zero), goal replaced |
| shocks | forecast 4 s ahead; severity `U(28%, 72%)` of the goal's current value |
| cover | fixed premium 28, 10 s term, absorbs one shock then spent; lapses unused |
| ramp | shock gap shrinks 6.5 s → 4.0 s across the session; targets grow |
| win | 1000 inside 90 s |

Stats contract: `{score, goals, missed, bestGoal}`.

## Shape of the build

- `src/goals.js` — the whole rule set as a pure module: `createSim`, `step`,
  `buyCover`, plus the two judgement helpers `coverIsWorthIt` / `bestFeed` /
  `shouldSaveForCover` that the coach overlay AND the balance bots both call, so
  the advice the tutorial gives is provably the advice that wins. No React, no
  canvas, no DOM, no browser API. `scripts/balance.mjs` imports it directly.
- `src/data.js` — `GAME_CONFIG`, `COLORS`, `SKIN`. Every tunable and the
  reasoning behind it.
- `src/WealthBalloonGame.jsx` — the canvas component. Mutable state in refs, HUD
  written through `textContent` refs, `fx.update(dt)` then `fx.isFrozen()`
  early-return, full teardown on unmount, one event array reused per tick so the
  hot loop allocates nothing.
- `src/Screens.jsx` — Home (three goals, one forecast, cover snapping in), How to
  Play (7 s animated loop of the whole decision), Results.
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the skill gate; not part of the bundle.

## Rendering

Programmatic canvas only; no emoji sprites, no image files.

- Balloons are a 32-segment polar path traced in unit space and scaled to the
  live radius, with a shoulder/neck taper, a specular highlight and a knot. Radius
  maps `value / target`, so the dashed target ring IS the finish line.
- Fill colour is information, not decoration: blue = reachable, green = at or
  past target, red = cannot be finished in the time left. A player reads which of
  three balloons still deserves income at a glance.
- Cover is a blue arc ring whose sweep is the term remaining. The shock badge is
  a red pill carrying the rupee loss, the severity and a live countdown, with a
  small blue caret beneath it when the loss beats the premium.
- Sky, stars and skyline are pre-rendered to one offscreen bitmap per resize.

## Colour grammar

BLUE is cover and everything protective. GOLD is money — income, funded goals,
the banked score. GREEN means "this goal is going to make it". ORANGE is urgency
and never damage: a deadline closing in. RED is damage only: a forecast shock and
the money it takes.

## Tutorial

Three coach prompts inside the live game, each cleared by doing the thing rather
than by a timer: *hold a balloon to fund it* → *fill past the dashed ring before
its timer ends* → on the first forecast, *is the red number bigger than 28?*. The
How to Play screen plays the same three beats first as a 7-second animated loop.

## Anti-pause-scum

Returning from a background pause holds the session clock for a 3-second
re-acquire countdown. Without it, backgrounding the tab is a free pause button in
a game whose entire point is deciding under a clock.

## Balance

`node scripts/balance.mjs` — 6,000 seeded runs per bot over the shipped
`src/goals.js`, seed `0xba110032`. Exits non-zero unless all eight gates hold.

| bot | win% | mean | p25 | p50 | p75 | funded | premiums | lost |
|---|---|---|---|---|---|---|---|---|
| skilled | **87.5%** | 1212 | 1052 | 1257 | 1343 | 7.6 | 225 | 57 |
| casual | **31.9%** | 845 | 651 | 819 | 1041 | 6.1 | 177 | 116 |
| random | **0.0%** | 30 | 0 | 0 | 0 | 1.7 | 14 | 678 |
| idle | **0.0%** | 0 | 0 | 0 | 0 | 0.0 | 0 | 0 |
| spread | 0.0% | 107 | 85 | 106 | 131 | 3.0 | 289 | 110 |
| never-cover | 10.0% | 606 | 385 | 597 | 818 | 4.9 | 0 | 559 |
| always-cover | 44.0% | 944 | 799 | 975 | 1058 | 6.6 | 433 | 0 |

Skill gap skilled − random = **87.5 pp**. Robust across seeds: skilled
87.0–88.0%, casual 30.3–32.4%, random 0.0% at seeds 1 / 7 / 12345 / 999983 /
424242 (2,000 runs each).

## Ports and commands

Dev server on **5059**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs [--runs N] [--seed S] [--sweep]`.
