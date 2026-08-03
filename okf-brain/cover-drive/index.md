---
type: project
title: Cover Drive
description: Cricket batting game where you chase 48 runs off 18 balls with 3 wickets, tapping to swing at life-event deliveries against a real swept bat/ball collision, and choosing between four insurance scoring zones — education, protection, retirement and guaranteed income — that pay and risk differently.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/cover-drive
tags:
  - game
  - cricket
  - timing
  - collision
  - arcade
timestamp: 2026-08-03
---

# Cover Drive

One-thumb cricket. Chase **48 runs off 18 balls** with **3 wickets** in hand under
floodlights. The bowler telegraphs each delivery — a coloured length marker on the
pitch, a card naming it as a life event, red rails to the stumps when it is straight
— then the bat sweeps and the ball either finds the middle of it or does not. Where
you tap across the bottom of the screen picks which of four insurance zones you are
hitting into, and those zones pay and risk differently. Runs are the score.

## Financial hook

Timing, and what shot selection actually costs. The game is one argument laid out as
a run chase:

- **You do not choose the deliveries.** "Medical emergency yorker", "Inflation
  bouncer", "Job-loss yorker", "School-fee seamer", "Rent-hike nip-backer",
  "Tax-season off-cutter", "Retirement floater". They arrive on someone else's
  schedule; all you control is how you meet them and where you send them.
- **The required rate forces the decision.** 48 off 18 is 2.67 a ball. Guaranteed
  Income pays 2 whatever you do and can never get you caught — and tops out at 36 off
  18, below the target. Safety alone is a way to lose, which is the honest version of
  "cash under the mattress is a decision too".
- **Cover is a floor, not a ceiling.** A middled Protection Cover banks a wicket
  shield, which absorbs one dismissal and never adds a run — exactly what a term plan
  does. It has to be banked *before* the ball that would have ended the innings.
- **Growth is volatile on purpose.** Retirement Corner is the only six on the field
  and the only zone where a merely-good shot is caught over a third of the time.
- **The bowler gets quicker.** +6% every over, so the cost of the same mistake rises
  with time and so does the value of already being covered.

## Contact model

There is no stopwatch anywhere in the scoring. `src/physics.js` (which imports
nothing at all) models:

- the **ball** as a circle of radius 36 mm on a straight line across the pitch, at a
  constant 64–93 km/h depending on pace and over;
- the **bat** as a segment from 0.34 m to 0.98 m out from the batter's hands, rotating
  at a constant rate through 118° over 0.30 s;
- **contact** as a swept test: the swing is sub-stepped 256 times (1.17 ms each) and
  each sub-step measures the true minimum distance between the ball's *travel segment*
  and the *blade segment*, then bisects for the contact instant and validates it
  against the blade's height span, the crease line, and the face's direction of travel.

The shot band is **where on the blade it landed** — within 125 mm of the sweet spot is
middled, within 260 mm is good, anywhere else on the blade is an edge, and off the
blade is a miss (bowled if the ball was on the stumps). The timing windows are not
authored: `connectWindow()` bisects that same collision per delivery and reports
seconds, and the gauge draws exactly what it returns.

**Batter placement** is derived, not fixed. The hands track the delivery's line 88% of
the way and the body stands 0.22 m to the leg side of them; the residual 0.41–0.59 m
between hands and ball line is what sets the windows, so a ball angled away from the
body is genuinely harder and the marker telegraphs it before the run-up.

## The four zones

| Zone | Middled | Good | Edge | Caught on a good shot |
|---|---|---|---|---|
| Child's Education — through the covers | 4 | 3 | 0 | 14% |
| Protection Cover — straight past the bowler | 4 **+ shield** | 1 | 0 | 10% |
| Retirement Corner — over deep midwicket, aerial | **6** | 3 | 0 | **36%** |
| Guaranteed Income — nudged square, along the ground | 2 | 2 | **1** | none |

Four tap lanes across the canvas width (80 px on a 320 px handset, past the 44 px
minimum) map to four drawn wedges of the outfield in the same left-to-right order.
`rules.suggestZone()` picks the least risk that still covers the required rate, and
buys Protection Cover when one wicket from the end with no shield in hand; the strip
shows its pick as a coach pip and the balance bots play by it.

## Shape of the build

- `src/data.js` — `GAME_CONFIG`, `COLORS`, `ZONES`. Every tunable: the chase, the
  pitch geometry in metres, the batter's blade and swing, the zone payouts and catch
  risks, pace tiers with weights/lengths/life-event names, the ramp, all presentation
  timings and effect counts.
- `src/physics.js` — **pure, imports nothing**. Ball flight, bat sweep, the swept
  collision, the closed-form ideal contact, the bisected timing windows, zone lookup.
- `src/deliveries.js` — **pure**. Seeded PRNG (mulberry32), Box–Muller Gaussian,
  delivery generation, the late cutoff, and the worst-case ball duration the session
  gate is built on.
- `src/rules.js` — **pure**. The chase state machine, zone payouts, catch and bowled
  rolls, the shield, the coach, and the stats contract. Imports only the two above.
- `src/CoverDriveGame.jsx` — the canvas component. One projection function that
  everything on the field goes through, rendering, animation, input and juice; mutable
  state in refs so a 120 Hz tick never re-renders. It owns **no rules**.
- `src/Screens.jsx` — Home, How to Play (animated SVG demo plus the four-zone legend),
  Results (the shared template plus a zone summary table and a financial insight box).
- `src/kit/` — synced copy of `shared/game-kit`, byte-identical, never edited.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Colour grammar

Blue is the batter and the protection you own — helmet, shield pip, the Protection
Cover wedge. Orange is the delivery about to be bowled: the marker, the bowler's
stripe, the gauge needle. Red is the wicket. Gold is a boundary and the Retirement
wedge. Green is progress and the perfect band of the gauge, so green always means
"you are winning" and never means a hazard. Cyan is the Education wedge.

## Balance

`scripts/balance.mjs` imports the shipped `physics.js` / `deliveries.js` / `rules.js` /
`data.js` and drives whole innings headless through the same functions the canvas
calls. Measured at 2,000 innings per bot, seed `0x0c07d21e`:

| Gate | Requirement | Measured |
|---|---|---|
| **A perfectly timed swing always connects** | every pace, every over, every line | **4,450 / 4,450 connected and middled** |
| Reaction budget, fastest delivery | above ~0.25 s human reaction | **0.476 s** at 93 km/h |
| Connect window, fastest delivery | ≥ 0.150 s | **0.231 s** |
| Perfect window, fastest delivery | ≥ 0.030 s | **0.058 s** |
| Bat reaches every line bowled | inside (0.34 m, 0.78 m) | **0.589 m** worst |
| Skilled bat, σ = 35 ms | 55–90% | **83.6%** |
| Casual bat, σ = 60 ms | 15–55% | **34.8%** |
| Random swings (control) | ≤ 10% | **0.0%** |
| Longest possible innings | inside `sessionSeconds` (110 s) | **80.9 s** |
| `statsOf()` keys | the six-key contract | **OK** |

The first row is the regression test for the tunnelling class of defect the
2026-08-03 review reported. See `log.md`.

## Ports and commands

Dev server on **5056**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs [--runs N] [--windows]
[--target N] [--seed N]`.

CRM identity: `LEAD_NO_KEY = 'coverDriveLeadNo'`, `summaryDtls = 'Cover Drive Lead'`.
Lead capture is **Name + Mobile only** — no email field.
