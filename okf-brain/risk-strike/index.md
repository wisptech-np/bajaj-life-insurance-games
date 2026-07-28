---
type: project
title: Risk Strike
description: Flick-bowling on a pseudo-3D lane where ten green virus bottles stand in for life's risks; five frames, real strike and spare bonuses, inside a 120-second session.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/risk-strike
tags:
  - game
  - bowling
  - physics
timestamp: 2026-07-28
---

# Risk Strike

One-thumb flick bowling. A perspective lane runs away from the player to a deck
of ten green virus bottles — the four in front labelled Illness, Accident, Debt
and Inflation. Flick speed is power, flick angle is line, and the curl of the
swipe is the hook. Five frames, two balls each, real strike and spare bonuses,
inside a 120-second session.

## Financial hook

Ten risks stand between the player and a clear deck, and each rack gets one
decisive shot. A ball down the middle takes most of them and leaves the corners
standing: comprehensive cover is the shot that clears everything, not the one
that clears most of it. The scorecard repeats the point — a strike carries into
the next two balls, so getting it right once pays three times.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`. Every tunable lives here. Lane
  units are centimetres, so the deck geometry is the real one (105 cm lane,
  30.5 cm pin spacing, 21.7 cm ball, 12 cm pins); only the length is shortened,
  to 11.8 m, because a regulation lane spends too much of a two-minute session
  watching a ball travel.
- `src/physics.js` — the whole lane-plane simulation and the bowling scorer:
  rack layout, circle-circle collision with restitution and tangential friction,
  kickback plates, toppling and the fall window that carries the chain reaction,
  the flick-to-shot mapping, the aim-path predictor, `scoreGame`, `buildScorecard`.
  Pure: no React, no DOM. That is what lets the balance simulation drive the
  shipped physics instead of a copy of it.
- `src/RiskStrikeGame.jsx` — one canvas component with mutable state in refs,
  offscreen pin sprite, programmatic draw functions, and the frame/rack state
  machine (ready → rolling → tally → racking).
- `src/Screens.jsx` — Home (the lane itself in the same perspective, with a ball
  rolling and pins toppling), How to Play (3-beat CSS-animated SVG: flick, hook,
  clear), Results (score ring, pins/strikes/spares tiles, the four risk chips,
  Book a Slot / Retry / Home).
- `src/kit/` — synced copy of `shared/game-kit`, never edited in place.
- `scripts/balance-sim.mjs` — the balance gate.

## Rendering

The physics is solved entirely in lane coordinates (x across, y down) and the
renderer projects that plane through one pinhole camera:
`k = camDist / (camDist + y)` scales x, sizes every sprite, and *is* the screen
y. Deriving all three from the same number is what keeps a pin's base planted on
the lane at any view tuning. The camera distance itself is solved at resize from
four authored fractions (where the horizon sits, where the foul line sits, how
wide the lane is at each), so the perspective can be retuned without touching a
line of draw code.

## Colour grammar

Green is always risk (the virus-bottle pins), blue is always protection (the
shield ball, its glow, the aim line), gold is the reward (strike banner, marks).
The lane is a cool blue-slate rather than bowling-alley maple: warm wood would
put the playfield in the same family as the orange CTAs and flatten the read.

## Balance corrections

Four readings differ from the literal brief, each measured with
`scripts/balance-sim.mjs` (which imports the shipped physics) over 1,500 sessions
per player profile:

1. **Kickback plates** (`pins.kickback: 0.6`). Without walls beside the deck the
   corner pins are unreachable and a perfect pocket hit strikes only 15% of the
   time. With them the pocket strikes 30-35% and dead centre still splits at 1%.
2. **Aim gain** (`flick.angleGain: 0.115`). The whole playable spread of
   directions on a real lane is under 3 degrees; the raw swipe angle would put
   the gutter at a 4-degree thumb wobble.
3. **Release noise** (`flick.angleJitter`, `powerJitter`, `pins.rackJitter`) so
   identical inputs do not produce identical racks.
4. **`winPins: 44`**, set from the measured distribution.

Measured with the shipped values: a centred decent flick knocks 8-9 pins; the
pocket strikes 30-35% and dead centre 1%; a 24-degree swipe gutters 100% of the
time; casual sessions win **42.0%**, pocket-hunting sessions 74.4%, sloppy ones
4.4%; and a full five frames takes 53-63 s of the 120 available, so no simulated
session of any profile ran out of time.

## Ports and commands

Dev server on **5054**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`. Balance gate:
`node scripts/balance-sim.mjs 1500`.
