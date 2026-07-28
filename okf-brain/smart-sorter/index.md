---
type: project
title: Smart Sorter
description: Conveyor swipe-sorting where twelve money decisions ride a belt into a sorting head and must be filed left to Protect, right to Grow or down to the Bin before they scroll off the end; three mistakes ends the run.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/smart-sorter
tags:
  - game
  - swipe
  - conveyor
  - reaction
  - arcade
timestamp: 2026-07-29
---

# Smart Sorter

Ninety seconds on a conveyor. Cards enter at the top of the belt and ride down
into a sorting head in the bottom third; while a card is in the head you swipe it
onto one of three shelves. Filing it wrongly costs exactly what ignoring it
costs. Three mistakes and the run is over.

| Shelf | Gesture | Cards | Icon family |
|---|---|---|---|
| **Protect** | swipe **left** | Term Plan, Health Cover, Critical Illness, Accident Shield | shield silhouettes |
| **Grow** | swipe **right** | SIP, Mutual Fund, Bonds, Gold | bars, donut, trend line, coin stack |
| **Bin** | swipe **down** | Scam Call, Impulse Buy, Lottery Ticket, Dubious Tip | triangle, starburst, torn ticket, bolt |

## Financial hook

Triage under time pressure. The argument the game makes is not "insurance is
good" — it is that money decisions arrive faster than you can deliberate over
them, and that the sorting instinct is the thing worth having.

- **The three piles are not equally obvious when the belt is moving.** The cards
  that *feel* urgent — a hot tip, a lottery ticket, a call demanding action right
  now — are precisely the ones that belong in the bin. The cards that actually
  matter are the boring ones you have to remember to file. That inversion is the
  whole lesson, and it only bites at speed.
- **A missort costs the same as a miss.** Putting a scam call on the Grow shelf
  is not a lesser error than letting a term plan scroll past; both are one
  mistake. Acting wrongly and failing to act are priced identically, which is how
  they actually behave.
- **Urgent cards pay double and move 1.5x faster.** The reward for handling the
  thing that genuinely cannot wait is real, and so is the cost of fumbling it.
- **The combo rewards a clean run, not a fast one.** x1 to x5 on consecutive
  correct sorts, reset to x1 by any mistake. Reading the card beats swiping
  quickly: measured, a bot that missorts 6% of the time wins 36% of runs and one
  that missorts 15% wins 0.6%.
- **Protect and Grow are both correct answers.** Neither shelf outranks the
  other; the game never asks you to choose protection over growth, only to know
  which is which — and to bin what deserves binning.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `FAMILY_STYLE`. Every tunable: track
  geometry in normalised units, belt speed and ramp, urgent cadence, scoring and
  combo steps, the mistake budget, layout fractions with pixel clamps, every
  effect count.
- `src/items.js` — the twelve cards, their families, their icon *shape names*,
  and the deterministic picker (no family more than twice in a row, never the
  same card twice in a row). Pure.
- `src/rules.js` — the belt, the spawn schedule, the swipe judgement, the combo,
  the mistake budget and the win/lose decision. Everything in normalised track
  units; knows nothing about pixels. Pure.
- `src/layout.js` — the one place track units become pixels, plus `layoutReport()`
  so the gate can assert the geometry on real handset sizes. Pure.
- `src/SmartSorterGame.jsx` — canvas, paint, sound, input, HUD. Mutable state in
  refs; the twelve card faces and all belt furniture pre-rendered once per resize
  and blitted; HUD numbers written through element refs.
- `src/Screens.jsx` — Home (the belt itself as inline SVG, cards riding down and
  peeling off to both shelves), How to Play (three shelf rows with the gesture
  animated on each badge), Results (score ring against the target, the
  sorted/best-combo/mistakes tiles, Book a Slot / Retry / Home).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Colour grammar

One brand colour per direction, used for nothing else, so the shelf and the
gesture are the same fact:

- **BLUE `#003DA6`** — Protect, and left.
- **GREEN `#28A745`** — Grow, and right.
- **ORANGE `#F26522`** — Bin, and down.
- **GOLD** is urgent, and only urgent.
- **RED `#EF4444`** is reserved exclusively for mistakes — the missort flash, the
  scroll-past burst, the lip at the end of the belt, the spent mistake pips.
  Nothing the player is supposed to touch is ever red, so red always means "that
  one cost you".

## Balance

`node scripts/balance.mjs [runs] [--sweep]` drives the shipped pure modules at
the kit's fixed 1/120 s step. 500 seeded runs per policy:

| Policy | Win | Score (median) | Sorted (median) | Mistakes (mean) |
|---|---|---|---|---|
| Casual — 6% missort, 250 ms reaction (the brief's bot) | **36.2%** | 6,120 | 41 | 2.44 |
| Perfect — 0% missort, 250 ms reaction | 100% | **10,360** | 53 | 0.00 |
| Sloppy — 15% missort, 400 ms reaction | 0.6% | 1,160 | 15 | 2.99 |
| Idle — never swipes | 0% | 0 | 0 | dead in 10.4 s |

Casual lands mid-band at 36.2%; the perfect bot scores 8.6x the 1,200 target, so
the ceiling is far above the win line. The 36-point gap between 6% and 15%
missort is the game: accuracy, not speed.

Four further things the gate proves that a win rate cannot:

- **No card overlaps another.** Urgent cards ride at 1.5x and close on whatever
  is ahead of them, which is why they launch from further back
  (`track.urgentSpacing = 0.52` against an ordinary `0.34`). A dedicated *lazy*
  policy holds every card to the last instant purely to force the tightest
  geometry the rules can produce: worst measured gap **0.287 track units**, zero
  spawn-order inversions across every run of every policy.
- **The reaction window never closes faster than a human can answer.** Narrowest
  window over every card of every run is **0.698 s**, against a 250 ms reaction.
- **The layout holds on real handsets.** Six stage sizes from 300x420 to 410x840;
  on all of them the sorting head's centre sits 72-76% down the stage, a card
  fits inside the head band, and the tightest card gap in pixels exceeds the card
  height.
- **Every item has its own icon shape.** The gate reads the `ICONS` table out of
  `SmartSorterGame.jsx` and joins it against `items.js` — 12 items, 12 distinct
  shapes, four per family, none missing and none orphaned.

## Ports and commands

Dev server on **5061**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `pnpm balance` (or
`node scripts/balance.mjs 500 --sweep`).
