---
type: project
title: Goal Keeper
description: Penalty-save reaction game — ten penalties at the family's milestone banners, a 400ms telegraph that lies one shot in five, swipe to dive into one of six zones, six saves to win and five conceded to lose.
resource: file:///c:/Users/Diwakar.Adhikari01/Desktop/bajaj-life-insurance-games/goal-keeper
tags:
  - game
  - reaction
  - penalty
  - arcade
timestamp: 2026-07-29
---

# Goal Keeper

You are the keeper; behind the net hang three family milestone banners (Child's
Education, Family Home, Retirement). Ten penalties. Each run-up carries a 400 ms
telegraph — body lean, plant chevron, a dotted aim arc — that is truthful on 80%
of shots and a feint on the other 20%. The ball is then in the air for 550 ms,
shortening to 380 ms by shot 10, with every 4th shot a faster double-value Risk
shot. SWIPE to dive: direction picks the column, swipe LENGTH picks the height,
across 3 columns x 2 heights. Six saves wins; five conceded ends it. Dev port
**5057**.

## Financial hook

Protection is a decision made before you know the outcome. The mechanic is the
argument, and the balance sim measures it rather than asserting it:

- The tell is honest 80% of the time and you never know which 80%. Reading it is
  worth a lot and never worth everything — that is risk, not ignorance.
- **Waiting for certainty is the losing strategy.** The `waiter` bot never
  guesses: it waits until the ball's path is unambiguous and then dives at the
  correct zone every single time. It wins 1.1% of runs, because by then it can
  only reach the middle of the goal. Perfect information that arrives too late is
  worth nothing.
- **Committing early is what works, and it is exactly what exposes you.** The
  `expert` bot commits mid-run-up and wins 95% — and every one of its losses is a
  feint. There is no reach without exposure.
- The **Shield glove** is cover, not skill: three saves in a row earn one, it
  absorbs the next goal, it pays 60 rather than 100+ and it resets the streak,
  because the cover did the work and not the read. It does not make you a better
  keeper; it stops one bad moment ending the run.
- Ten shots rather than one: a single penalty is a coin flip, ten is a record,
  and the streak bonus pays consistency over heroics.

## The dive-travel model

The one piece of design not in the brief, and the piece that makes the ramp real.
A dive costs `dive.baseMs` to leave the ground plus `dive.spanMs x reach(zone)`
to cover the ground:

| target | travel |
|---|---|
| Low centre | 164 ms |
| Top centre | 237 ms |
| Low corner | 296 ms |
| Top corner | 340 ms |

A save needs `commitMs + travel(zone) <= cueMs + flightMs + graceMs`. Early on,
any zone is reachable even if you wait for the ball. By shot 10 a reactive keeper
can reach the middle and nothing else, so the corners have to be read off the
run-up — which is precisely when a feint costs you. 17.5% of all penalties in the
gate profile are a correct read that arrived too late.

## Zones and scoring

Six zones, `zone = col + row * 3`; a swipe resolves to a continuous aim point
(`ax` −1..+1 across the goal, `ay` 0..1 grass to crossbar) and the zone is the
cell it falls in.

| event | value |
|---|---|
| Save | 100 |
| Risk-shot save (every 4th shot) | 200 |
| Streak bonus per save already banked | +25 |
| Perfect zone-centre dive (within 0.14 on both axes) | +50 |
| Goal absorbed by the Shield glove | 60, streak resets |

Stats contract: `{score, saves, conceded, streak}` with `streak` = best streak.

## Shape of the build

- `src/data.js` — `GAME_CONFIG` and `COLORS`; every tunable in one place.
- `src/shots.js` — **pure**: seeded shot-plan generation, zone geometry, swipe
  resolution, dive travel. No DOM, no React, no import of `data.js` (config is a
  parameter).
- `src/rules.js` — **pure**: save judgment, scoring, Shield glove, win/lose.
- `src/GoalKeeperGame.jsx` — the canvas component. Mutable state in refs, module
  level draw functions, an offscreen-prerendered arena rebuilt only on resize. It
  contains no rules: it decides only what a shot looks like.
- `src/Screens.jsx` — Home (the goal as inline SVG with its six zones, the
  banners, and a keeper going with the ball), How to Play (3-beat CSS-animated
  SVG), Results (score ring, saves/conceded/streak tiles, Book a Slot).
- `src/kit/` — byte-identical copy of `shared/game-kit`, never edited in place.
- `scripts/balance.mjs` — the balance gate; not part of the bundle.

Rendering is programmatic canvas and inline SVG only. No image files, no emoji
sprites: the striker and keeper are rigs of arcs and rounded strokes, the ball is
a radial gradient with drawn panels, the net is a clipped line mesh, the crowd is
a fixed pseudo-random dash field, the milestone banners are rounded rects with
drawn text. The scaffold's `guardian_shelter_bg.png` on the thank-you screen was
replaced with a gradient stadium wash, so the game ships with zero binary assets.

## Colour grammar

Orange is you — the keeper's kit, the gloves, the swipe line: the thing standing
in the way. Blue is the striker and the risk he represents (and the Shield glove,
which is cover rather than reflex). Green is a goal kept out, red is a goal
conceded, gold is the telegraph and the milestone banners — the tell, and the
things the tell is protecting.

## Balance

`scripts/balance.mjs` imports the shipped `data.js` / `shots.js` / `rules.js` and
never re-implements a rule. Four profiles, each with its own band; it also sums
the pacing constants per run and fails if a session could exceed the 100 s clock
or the build standard's 120 s cap. 20,000 runs per profile, seed `0x9051f00d`:

| profile | win% | band | saves/run | score |
|---|---|---|---|---|
| **`spec`** (the gate: honest cue reader, trusts the plant p=0.8, +150 ms commitment) | **33.8%** | 25–45% | 4.17 | 577 |
| `lookahead` (exploit canary: waits for the reveal, then dives at the TRUE zone) | 21.5% | ≤35% | 3.66 | 592 |
| `expert` (commits mid-run-up, 95% on the cue) | 95.4% | ≥85% | 5.88 | 1,095 |
| `waiter` (ignores the cue, dives on the revealed ball) | 1.1% | ≤35% | 1.62 | 234 |
| `panic` (random zone at ball strike) | 0.8% | ≤10% | 1.02 | 124 |

Per-shot save rate for the gate profile, shots 1→10: 64.5 / 64.6 / 64.9 / 21.7* /
64.4 / 42.9 / 43.9 / 11.0* / 22.2 / 22.0 (* = Risk shot). Saves distribute
0–6 = 1.2 / 5.5 / 10.8 / 20.5 / 15.6 / 12.6 / **33.8%**, so a loss usually reads
as one or two saves short. A run takes 49.5 s on average and 61.4 s at its
longest. The gate also brute-forces the maximum achievable score (1475) and
fails if `RESULT_TARGET_SCORE` (1200) exceeds it, and asserts a legibility
budget (tell readable 248 ms + 250 ms nominal reaction + 40 ms swipe + 25 ms
touch = 563 ms ≤ the gate bot's 575 ms commit, 12 ms spare). Every profile is
charged `dive.deviceLatencyMs` (25 ms, touch pipeline) and
`dive.swipeAllowanceMs` (40 ms, the gesture's own travel time), with
`dive.graceMs` raised by the sum (25 → 90 ms) so both sides move together and
the band is unchanged.

No profile reads hidden state: the cue readers see only the plant that is drawn,
so an honest reader is right on a feint 0.2 × 1/5 = 4% of the time — effective
read rate 0.648. **Latency sensitivity, printed on every run:**

    +0ms 33.8% | +20ms 21.3% | +40ms 15.4% | +60ms 5.6% | +80ms 3.1% | +120ms 0.0%

That slope (~0.3 points of win rate per millisecond) is intrinsic to the brief's
constants — an honest reader clears 6-of-10 three runs in four on reading alone,
so ~45 points of win rate have to come out of a ~200 ms timing window. It is why
the swipe is timed from its start rather than its release, and why the telegraph
is fully legible at 248 ms.

One correction was made against the brief and is documented in `log.md`: the
brief's bot description (`0.8` truthful, `1/6` feint) yields an effective 0.673
rather than the "~0.55" it quotes, and either figure clears 6-of-10 far above the
25–45% band. Every constant the brief names ships exactly as specified; the gap
was closed with the dive-travel model above, which the brief's own "150 ms
dive-commitment latency" implies but does not define.

A review fix round on the same day landed five further changes, all detailed in
`log.md`: `RESULT_TARGET_SCORE` was above the achievable score ceiling (1600 vs
1475) and the ring could never close, now 1200 with the ceiling asserted in the
gate; the dive commit is stamped when the swipe STARTS rather than when it ends,
so the gesture's own duration is no longer billed against the ball (it was
costing 120–157 ms on the tightest shots, worth 30+ points on the latency curve
above), with a 150 ms shaping window closing the wait-and-watch exploit that
would otherwise open; the input dead zone for a finger already resting on the
glass during the walk-back; squash-and-stretch on the ball off the boot and on
the keeper landing, which the juice floor names and the first build had claimed
but never called; and the gate's cue-reader model was made honest (it no longer
branches on `shot.truthful`), moving the gate profile 37.9% → 33.8% with no
retune needed. Four deferred minors were recorded at the end of `log.md`.

A second review round then found that the gesture-window mitigation from the
first round was itself a **100% win exploit** — crediting the commit clock back
to the start of the swipe while resolving the zone at the end lets a player nudge
18 px early and then pick the zone off the live ball (measured: 4,000 runs,
100.0% win, 6.00 saves of 6). Capping the refund does not help; 20 ms of credit
already returns 91.8%, because the ball reveals at ~34% of flight and the
remaining ~66% is enough to reach any zone. The mechanism was removed rather than
retuned — the dive is timed from when it is finalised, and time is handed back
only through `dive.graceMs`, which moves the deadline for everyone and cannot be
deferred into. A `lookahead` canary now guards the whole exploit class (21.5%
honest, 87.2% at a 40 ms credit, 35% ceiling). The same round restored the
committed-dive highlight on a second touch, added the legibility assertion, and
cleared the per-frame allocations (out-param `zoneCentre`, `paintGlove`, cached
rig gradients via `buildPaints()`, hoisted dash arrays), so the hot-loop claim is
now accurate.

A final pass closed the last gap: the swipe's own duration (60-140 ms) was still
billed to the player and invisible to the gate, which put a median player at
**17.0%** against the briefed 25-45% floor — only the fast tail was ever in band.
`dive.swipeAllowanceMs` (40 ms) is now charged to every profile and repaid via
`dive.graceMs` (50 -> 90 ms). `spec` and the `lookahead` canary read 33.8% and
21.5% before and after; a 250 ms-reaction / 100 ms-swipe player moves from 9.4%
to 33.8%, landing on the gate profile's own number. Because it is grace and not a
credit against the commit clock, the exploit stays shut. Three deferred minors
remain, listed at the end of `log.md`.

## Ports and commands

Dev server on **5057**. `pnpm install`, `pnpm dev`, `pnpm build` (uat — the
verification gate), `pnpm build:preprod`, `pnpm build:prod`, `pnpm preview`,
`node scripts/balance.mjs --runs 20000`.
