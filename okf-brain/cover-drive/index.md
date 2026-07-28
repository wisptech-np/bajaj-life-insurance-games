---
type: project
title: Cover Drive
description: Cricket batting timing game where you chase 40 runs off 18 balls with 3 wickets, tapping to swing at life-event deliveries whose PERFECT window narrows with the bowler's pace, and banking a wicket shield by middling every sixth Cover ball.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/cover-drive
tags:
  - game
  - cricket
  - timing
  - arcade
timestamp: 2026-07-29
---

# Cover Drive

One-thumb cricket. Chase **40 runs off 18 balls** with **3 wickets** in hand under
floodlights. The bowler telegraphs each delivery — a coloured length marker on the
pitch, a card naming it as a life event, red rails to the stumps when it is straight
— then a timing gauge sweeps around the crease and you tap to swing. Runs are the
score; win by reaching 40 with wickets remaining.

## Financial hook

Timing, and what cover actually buys. The whole game is one argument laid out as a
run chase:

- **You do not choose the deliveries.** "Medical emergency yorker", "Inflation
  bouncer", "Job-loss yorker", "School-fee seamer", "Rent-hike nip-backer",
  "Tax-season off-cutter", "Retirement floater". They arrive on someone else's
  schedule; all you control is how you meet them.
- **The required rate is real.** 40 off 18 is 2.22 a ball — you cannot nurdle
  singles to it, you need roughly eight boundaries. Playing safe is also a way to
  lose, which is the honest version of "cash under the mattress is a decision too".
- **Cover is a floor, not a ceiling.** The wicket shield never adds a run. It only
  stops one mistake ending the innings — exactly what a term plan does. Measured,
  the casual bat wins 0.67 shields an innings and has 0.37 wickets absorbed by them.
- **You have to earn the cover before you need it.** The shield is banked on a Cover
  ball, mid-chase, well before the ball that would have bowled you. Buying protection
  after the event is not on the menu, in the game or outside it.
- **The bowler gets quicker.** +8% every over, so the cost of the same mistake rises
  with time and so does the value of already being covered.

## Timing model

Windows are half-widths around the ideal contact instant, authored in milliseconds
for a reference-pace delivery and **divided by that delivery's speed factor**, so a
quicker ball is quicker in both senses — less time to react, and a narrower target.
That is what makes the three telegraphed paces matter for difficulty rather than only
for when to tap, and the gauge draws its green bands from the real window, so the
telegraph is honest.

| Band | Spec ms | Reference | Over-3 Express | Outcome |
|---|---|---|---|---|
| PERFECT | 36 | ±18.7 ms | ±13.6 ms | Boundary, alternating **4** then **6** |
| GOOD | 90 | ±46.8 ms | ±34.0 ms | **1** then **2**, alternating |
| EDGE | 150 | ±78.0 ms | ±56.7 ms | No run, 35% chance of a wicket |
| MISS | — | — | — | Out if the ball was on the stumps (60% of deliveries) |

Every 6th ball is a **Cover ball**: a PERFECT on it banks one wicket shield (max 1),
which absorbs the next dismissal — the stumps still rattle, the wicket does not
count. From ball 7 the bowler mixes in a **slower ball at 0.8×**: more air, a wider
window, and a wrecked rhythm if you had settled into the quick one.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable: the chase, the three
  timing windows and their scale, pace tiers with their weights, lengths and life-event
  names, the ramp, the Cover ball, all presentation timings and effect counts.
- `src/deliveries.js` — **pure**. Seeded PRNG (mulberry32), Box–Muller Gaussian,
  delivery generation, the per-delivery timing windows, the late cutoff, and the
  worst-case ball duration the session gate is built on. No DOM, no React, no canvas,
  no imports at all.
- `src/rules.js` — **pure**. Swing classification, the chase state machine (runs,
  wickets, shield, alternation cursors, win/lose precedence) and the stats contract.
  Imports only `deliveries.js`.
- `src/CoverDriveGame.jsx` — the canvas component. Rendering, animation, input and
  juice; mutable state in refs so a 120 Hz tick never re-renders. It owns **no rules**
  — it calls `makeDelivery()` and `resolveBall()` and renders what they return.
- `src/Screens.jsx` — Home (the ground as inline SVG, ball pitching on the marker and
  driven away as the bat comes through), How to Play (3-beat CSS-animated SVG: read
  the ball, tap on the green, bank your cover), Results (runs ring against the 40
  target plus boundaries/perfects/wickets tiles).
- `src/kit/` — synced copy of `shared/game-kit`, byte-identical, never edited.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Colour grammar

Blue is the batter and the protection you own — helmet, shield pip, the Cover ball's
halo. Orange is the delivery about to be bowled: the marker, the bowler's stripe, the
gauge needle. Red is the wicket — the stump-line rails, the timber, the Express pace.
Gold is a boundary. Green is reserved for progress and for the part of the gauge you
are aiming at, so green always means "you are winning" and never means a hazard.

## Balance

`scripts/balance.mjs` imports the shipped `deliveries.js` / `rules.js` / `data.js` and
drives whole innings headless through the same functions the canvas calls — it never
re-implements a rule. Three assertions, plus a stats-contract shape check; the script
exits 1 if any fails.

| Gate | Requirement | Measured (500 seeds) |
|---|---|---|
| Casual bat, σ = 45 ms | chase success 25–45% | **35.0%** (36.3% over 4,000) |
| Metronome bat, σ = 12 ms | ≥ 95%, skill ceiling reachable | **100.0%** |
| Longest possible innings | inside `sessionSeconds` (100 s) | **72.7 s**, 27.3 s spare |
| `statsOf()` keys | exactly runs/boundaries/wickets/perfects | **OK** |

Casual bat detail: 15.4 balls faced, 4.82 perfects, 4.82 boundaries, 1.72 wickets,
0.67 shields won and 0.37 wickets absorbed per innings; shot mix 31.4% perfect /
36.4% good / 21.6% edge / 10.6% miss. Its losses split **162 all out against 163
balls gone**, so both lose conditions are live — the game is neither a pure survival
test nor a pure run chase.

One spec constant was corrected: `timing.windowScale = 0.52` scales all three windows
together, because the literal 36/90/150 ms windows measure **99.3%** chase success
against the spec's own σ = 45 ms bot. See `log.md`.

## Ports and commands

Dev server on **5056**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs [--runs N] [--sweep]
[--scale S] [--seed N]`.

CRM identity: `LEAD_NO_KEY = 'coverDriveLeadNo'`, `summaryDtls = 'Cover Drive Lead'`.
