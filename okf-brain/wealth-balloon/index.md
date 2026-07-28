---
type: project
title: Wealth Balloon
description: Press-your-luck inflate where a wealth balloon grows on 10 x t^1.6 against a hidden burst threshold, an honest-but-noisy wobble is the only warning, one Term Shield absorbs the first burst at 50%, and needle drones from round 4 tax the fattest balloons.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/wealth-balloon
tags:
  - game
  - press-your-luck
  - timing
  - arcade
timestamp: 2026-07-29
---

# Wealth Balloon

One-thumb press-your-luck. HOLD to inflate the wealth balloon; the counter above
it climbs on `10 x t^1.6`, so the next second of holding is always worth more
than the last one was. Each round the balloon carries a hidden burst threshold
drawn uniform between 2.2 s and 4.6 s. At 70% of it (give or take 0.35 s) the
balloon starts to wobble and shifts blue to orange to red — the only information
you get. RELEASE to bank what is shown. Six rounds or a 120-second cap; win by
banking 500.

## Financial hook

Knowing when to stop, and what cover can honestly promise.

- **The curve is the temptation.** `t^1.6` means the balloon is permanently
  offering a better deal than the one already on the table. That is exactly how
  an un-hedged position feels on the way up, and it is why people hold too long.
- **The warning is real, early, and imprecise.** The tell starts at 70% of the
  threshold and can never arrive after the burst — the game measures that
  invariant over every simulated round (average lead 1.02 s). But the ±0.35 s of
  noise means backing the threshold out of the wobble only narrows it to a
  one-second window. Real risk warnings behave the same way; you still have to
  decide.
- **Consistency beats nerve, and it is measured.** A bot that lets go the moment
  it sees the wobble wins 38.5% of runs. A bot that reads the same wobble and
  pushes to 95% of what it implies banks 1.63x more per surviving round and wins
  8.7%, because a burst costs the round AND the compounding streak.
- **Cover rescues the money, not the momentum.** The Term Shield banks half of
  whatever the balloon was holding — about 0.9 of an average banked round. It
  does not restore the streak and it does not raise the ceiling. It stops one bad
  moment being a total loss, which is the honest claim a term plan can make.
- **The drones are the difficulty, and they lean on greed.** The lane is not
  outside a sensible balloon: the envelope reaches it at 2.044 s and a
  disciplined release (median 2.38 s) covers it 69% of the time, so everyone is
  exposed — removing the drones moves a disciplined run from 38.5% to 61.8%.
  Greed adds exposure on top: 94% of greedy releases cover the lane, and
  conditional on reaching a release a greedy balloon pops 10.5% of the time
  against 6.0% for a disciplined one.

## Rules

| element | rule |
|---|---|
| value | `10 x t^1.6` — 35 at 2.2 s, 71 at 3.4 s, 115 at 4.6 s |
| burst threshold | `U(2.2 s, 4.6 s)` per round, never shown |
| the tell | wobble + hue shift starting at `0.7 x threshold ± 0.35 s` |
| bank | release before the threshold with no drone touching the envelope |
| burst | round worth nothing, compounding streak resets |
| Term Shield | one per game, absorbs the first burst and banks 50% of the at-burst value |
| compounding | `+18 x (streak - 1)` per consecutive banked round, capped at 5 steps |
| needle drones | rounds 4/5/6 (1/1/2 drones); release into one and it pops regardless |
| win | 500 banked across 6 rounds inside 120 s |

Stats contract: `{score, rounds, bursts, bestRound}`.

## Shape of the build

- `src/rounds.js` — the whole rule set as a pure module: the value curve, the
  radius curve, `drawRound` (threshold, tell onset, drone lanes), `needleX` /
  `needleHitAt`, `resolveRelease`, the run accumulator with the Term Shield and
  the compounding bonus, and `runStats`. No React, no canvas, no DOM, no browser
  API. `scripts/balance.mjs` imports it directly, so the shipped game and the
  measured game are literally the same module. Every spatial quantity is in FIELD
  UNITS — fractions of the canvas width — so the drone geometry is identical on a
  320 px handset and a 430 px one.
- `src/data.js` — `GAME_CONFIG`, `COLORS` and `SKIN`. Every tunable plus the
  measured balance table and the reasoning behind each corrected constant.
- `src/WealthBalloonGame.jsx` — the canvas component. Mutable state in refs, HUD
  written through `textContent` refs, `fx.update(dt)` then `fx.isFrozen()`
  early-return, full teardown on unmount, no allocation in the hot loop.
- `src/Screens.jsx` — Home (the game as inline SVG: a balloon inflating past its
  tell, the counter climbing, a drone crossing the lane), How to Play (4-beat
  CSS-animated SVG), Results (banked ring against the target, rounds/bursts/best
  tiles, Book a Slot / Retry / Home).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

## Rendering

Programmatic canvas only; no emoji sprites, no image files.

- The balloon is a 40-segment polar path traced in UNIT space and scaled to the
  live radius, with a squared-off taper toward the neck so it reads as a balloon
  rather than a circle. Two counter-rotating sine harmonics give it the wobble,
  amplitude driven entirely by tell intensity.
- The hue shift is three unit-space radial gradients (calm / warm / hot) built
  once per resize and cross-faded with `globalAlpha`. Rebuilding a gradient at
  the live radius would be one allocation per frame in the hottest loop; this is
  none.
- Drones are drawn from primitives: two blurred rotor ellipses, a rounded steel
  body, a blinking warning eye that goes solid while it is actually overlapping,
  and the spike itself. Their lane is a dashed line so the pass can be timed.
- The sky, its stars, the skyline and the launch pad are pre-rendered to one
  offscreen bitmap per resize and blitted.

## Colour grammar

Blue is a young, safe balloon and everything protective — the Term Shield, the
banked total. Orange is heat: the honest tell, the moment the balloon starts
telling you it has had enough. Red is the burst and the drones. Gold is banked
wealth. Green is reserved for progress toward the target, so green always means
"you are winning" and never means a hazard.

## Balance

`node scripts/balance.mjs` — seeded runs per bot over the shipped
`src/rounds.js`. Exits non-zero unless the disciplined bot lands in 30–50% and
the greedy bot stays under 15%. Figures below are 20,000 runs at seed
`0xba110032`; the 500-run gate is the same numbers with a ±4 pp window.

| bot | strategy | win% | mean | p25 | p75 | bursts |
|---|---|---|---|---|---|---|
| disciplined | lets go on the tell, σ = 0.3 s reaction | **38.5%** | 454 | 398 | 521 | 0.4 |
| greedy | reads the tell, holds to 95% of what it implies | **8.7%** | 298 | 202 | 376 | 2.5 |
| blind-70 | fixed 2.38 s, never looks | 21.1% | 376 | 284 | 494 | 0.9 |
| blind-95 | fixed 3.23 s, never looks | 4.8% | 254 | 163 | 322 | 3.0 |
| ceiling | holds to the tell's provably safe bound, dodges drones | 77.1% | 546 | 507 | 604 | 0.2 |

At 500 runs the default seed gives disciplined 43.2% / greedy 7.8%; across five
other seeds, 34.8–41.6% and 7.2–11.2%. The sim also asserts two invariants over
every simulated round — the tell always precedes the burst, and the worst-case
held time in a run (24.3 s) leaves ample slack inside the 120 s session.

One structural correction was needed to make the spec's own two gates
satisfiable at the same time (the compounding bonus, and the win line moving from
320 to 500 — both gates hold only for a line in [481, 514]). Counterfactual flags
on the sim — `--bonus 0`, `--shield-keeps-streak`, `--no-drones` — reproduce every
rejected alternative against the same shipped rules. The derivation is in
`log.md`.

## Ports and commands

Dev server on **5059**. `pnpm dev`, `pnpm build` (uat), `pnpm build:preprod`,
`pnpm build:prod`, `pnpm preview`, `node scripts/balance.mjs [--runs N] [--seed S] [--sweep]`.
